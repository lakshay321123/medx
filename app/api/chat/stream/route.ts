import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
import { verifyWithOpenAI, Verdict } from '@/lib/ai/verifyWithOpenAI';
import { composeCalcPrelude } from '@/lib/medical/engine/prelude';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CORS helper
function corsify(res: Response, extra?: Record<string, string>) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  h.set('Cache-Control', 'no-store');
  if (extra) {
    for (const k of Object.keys(extra)) h.set(k, String(extra[k]));
  }
  return new Response(res.body, { status: res.status, headers: h });
}

const recentReqs = new Map<string, number>();        // dedupe by clientRequestId
const verdictCache = new Map<string, { v: Verdict, exp: number }>(); // verifier cache

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

function cacheGet(key: string) {
  const hit = verdictCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) {
    verdictCache.delete(key);
    return undefined;
  }
  return hit.v;
}
function cacheSet(key: string, v: Verdict, ttlMs: number) {
  verdictCache.set(key, { v, exp: Date.now() + ttlMs });
}

// Tight prelude for doc mode
function filterComputedForDocMode(items: any[], latestUser: string) {
  const msg = (latestUser || '').toLowerCase();
  const mentions = (s: string) => msg.indexOf(s) >= 0;
  const isResp = mentions('cough') || mentions('fever') || mentions('cold') || mentions('breath') || mentions('sore throat');
  const needsPE = mentions('chest pain') || mentions('pleur') || mentions('shortness of breath') || /\bsob\b/.test(msg);

  const out: any[] = [];
  for (const r of items) {
    if (!r) continue;
    if (!(Number.isFinite(r.value) || typeof r.value === 'string')) continue;

    const noteStr = Array.isArray(r.notes) ? r.notes.join(' ').toLowerCase() : '';
    const lbl = String(r.label || '').toLowerCase();
    if (/surrogate|placeholder|phase-1|inputs? needed|partial/.test(noteStr + ' ' + lbl)) continue;

    let keep = false;
    if (isResp && /(curb-?65|news2|qsofa|sirs|qcsi|sofa)/i.test(lbl)) keep = true;
    else if (/(perc)/i.test(lbl)) keep = needsPE;
    else if (/(glasgow-blatchford|ottawa|ankle|knee|head|rockall|apgar|bishop|pasi|burn|maddrey|fib-4|apri|child-?pugh|meld)/i.test(lbl)) keep = false;
    else keep = /(curb-?65|news2|qsofa|sirs)/i.test(lbl);

    if (keep) out.push(r);
  }
  return out;
}

// Shared core handler
async function handle(req: NextRequest, payload: any) {
  const method = req.method || 'GET';
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const context = payload?.context;
  const clientRequestId = payload?.clientRequestId;
  const mode = payload?.mode;

  const now = Date.now();
  for (const [id, ts] of Array.from(recentReqs.entries())) {
    if (now - ts > 60_000) recentReqs.delete(id);
  }
  if (clientRequestId) {
    const ts = recentReqs.get(clientRequestId);
    if (ts && now - ts < 60_000) return corsify(new Response(null, { status: 409 }));
    recentReqs.set(clientRequestId, now);
  }

  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY || '';
  const url   = (base.replace(/\/$/, '')) + '/chat/completions';

  // remove any incoming system prompts
  let finalMessages = messages.filter((m: any) => m && m.role !== 'system');

  // build user text from entire conversation
  const onlyUsers = finalMessages.filter((m: any) => m.role === 'user');
  let userText = '';
  for (const u of onlyUsers) userText += (u?.content || '') + '\n';
  const latestUserMessage = onlyUsers.length ? (onlyUsers[onlyUsers.length - 1]?.content || '') : '';

  const ctx = extractAll(userText);
  const computed = computeAll(ctx);

  const taskMode = computed && computed.length ? 'analyzing' : 'thinking';

  const JOINT_RULES =
    'JOINT DECISION PROTOCOL:\n' +
    '- You (OpenAI GPT-5) and the Calculators work TOGETHER.\n' +
    '- Treat calculator outputs as a first pass; correct edge or missing-input errors.\n' +
    "- Cross-check physiology: Winter’s (expected pCO2), osmolality 275–295 normal, albumin-corrected anion gap, potassium bands, renal flags.\n" +
    '- If conflict exists, use your corrected values.\n' +
    '- Be decisive; calculators are data, not directives.\n' +
    '- Do not output any verification badge or correction line to the user.';

  // prepend system rules
  finalMessages = [{ role: 'system', content: JOINT_RULES }].concat(finalMessages);

  // verifier first, one minute timeout, ten minute cache
  const cacheKey = await sha256Hex(JSON.stringify({ ctx, ver: 'v1' }));
  let verdict = cacheGet(cacheKey);
  if (!verdict) {
    verdict = await verifyWithOpenAI({
      mode: String(mode || 'default'),
      ctx,
      computed,
      conversation: finalMessages.map((m: any) => ({ role: m.role, content: m.content })),
      timeoutMs: 60_000
    }) || undefined;
    if (verdict) cacheSet(cacheKey, verdict, 10 * 60 * 1000);
  }

  // overlay corrections
  let blended = computed.slice();
  if (verdict && verdict.corrected_values && typeof verdict.corrected_values === 'object') {
    // index by id
    const byId = new Map<string, any>();
    for (const r of blended) {
      if (r && r.id) byId.set(String(r.id), r);
    }
    for (const k of Object.keys(verdict.corrected_values)) {
      const v: any = (verdict.corrected_values as any)[k];
      const t = byId.get(k);
      if (t) {
        if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'value')) {
          Object.assign(t, v);
        } else {
          (t as any).value = v;
        }
        const existingNotes = Array.isArray((t as any).notes) ? (t as any).notes : [];
        const newNotes = v && Array.isArray(v.notes) ? v.notes : [];
        const mergedNotes = Array.from(new Set(existingNotes.concat(newNotes)));
        if (mergedNotes.length) (t as any).notes = mergedNotes;
      } else {
        const entry: any = { id: k, label: k };
        if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'value')) {
          entry.value = v.value;
          if (v.unit) entry.unit = v.unit;
          if (Array.isArray(v.notes)) entry.notes = v.notes.slice();
        } else {
          entry.value = v;
        }
        byId.set(k, entry);
      }
    }
    blended = Array.from(byId.values());
  }

  // crisis heuristics computed from ctx (inputs) for promotion cues
  const toNum = (x: any) => (typeof x === 'number' ? x : Number(x));
  const g = toNum((ctx as any).glucose ?? (ctx as any).glucose_mg_dl);
  const bicarb = toNum((ctx as any).HCO3 ?? (ctx as any).bicarb ?? (ctx as any).bicarbonate);
  const ph = toNum((ctx as any).pH);
  const kVal = toNum((ctx as any).K ?? (ctx as any).potassium);
  const hyperglycemicCrisis = (Number.isFinite(g) && g >= 250) && ((Number.isFinite(bicarb) && bicarb <= 18) || (Number.isFinite(ph) && ph < 7.30));
  const hyperkalemiaDanger = Number.isFinite(kVal) && kVal >= 6.0;

  const mustShow = new Set<string>([
    'measured_osm_status', 'osmolar_gap', 'serum_osm_calc', 'anion_gap_albumin_corrected',
    'hyponatremia_tonicity', 'hyperkalemia_severity', 'potassium_status', 'dka_severity', 'hhs_flags'
  ]);
  const promoted: any[] = [];
  for (const r of blended) if (r && mustShow.has(r.id)) promoted.push(r);
  const crisisPromoted = (hyperglycemicCrisis || hyperkalemiaDanger) ? promoted : [];

  // doctor or research: add data-only prelude
  const showPrelude = (mode === 'doctor') || (mode === 'research') || /trial|research/i.test(String(mode || ''));
  if (showPrelude) {
    const filtered = filterComputedForDocMode(blended, latestUserMessage || '');
    const merged = crisisPromoted.concat(filtered);
    // de-dup by id while preserving order
    const mapById = new Map<string, any>();
    for (const r of merged) if (r && r.id && !mapById.has(r.id)) mapById.set(String(r.id), r);
    const linesArr: string[] = [];
    for (const r of Array.from(mapById.values())) {
      const val = r.unit ? String(r.value) + ' ' + String(r.unit) : String(r.value);
      const notesLine = Array.isArray(r.notes) && r.notes.length ? ' — ' + r.notes.join('; ') : '';
      linesArr.push(String(r.label || r.id) + ': ' + val + notesLine);
    }
    if (linesArr.length) {
      finalMessages = [{ role: 'system', content: linesArr.join('\n') }].concat(finalMessages);
    }
  }

  // optional calc prelude for model behavior, only if we added computed lines just above
  const calcPrelude = composeCalcPrelude(latestUserMessage || '');
  if (showPrelude && calcPrelude && finalMessages.length && finalMessages[0] && finalMessages[0].role === 'system') {
    finalMessages = [{ role: 'system', content: calcPrelude }].concat(finalMessages);
  }

  // profile context
  if (context === 'profile') {
    try {
      const origin = req.nextUrl.origin;
      const headers = { cookie: req.headers.get('cookie') || '' } as any;
      const sP = fetch(origin + '/api/profile/summary', { headers }).then(r => r.json()).catch(() => ({}));
      const pP = fetch(origin + '/api/profile', { headers }).then(r => r.json()).catch(() => null);
      const pkP = fetch(origin + '/api/profile/packet', { headers }).then(r => r.json()).catch(() => ({ text: '' }));
      const arr = await Promise.all([sP, pP, pkP]);
      const s: any = arr[0];
      const p: any = arr[1];
      const pk: any = arr[2];
      const sys = profileChatSystem({
        summary: s?.summary || s?.text || '',
        reasons: s?.reasons || '',
        profile: p?.profile || p || null,
        packet: pk?.text || '',
      });
      finalMessages = [{ role: 'system', content: sys }].concat(finalMessages);
    } catch {
      // ignore profile errors
    }
  }

  // call Groq and stream
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages: finalMessages,
    }),
  });

  if (!upstream.ok) {
    const errTxt = await upstream.text();
    return corsify(new Response('LLM error (' + method + '): ' + errTxt, { status: 500 }), {
      'X-Task-Mode': taskMode,
      'X-Verify-Timeout': '60000',
      'X-Verify-Used': verdict ? '1' : '0',
    });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'X-Task-Mode': taskMode,
      'X-Verify-Timeout': '60000',
      'X-Verify-Used': verdict ? '1' : '0',
    },
  });
}

// GET supports ?payload=<json> or legacy query params
export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const payloadParam = u.searchParams.get('payload');
  let payload: any = {};
  if (payloadParam) {
    try {
      payload = JSON.parse(decodeURIComponent(payloadParam));
    } catch {
      payload = {};
    }
  } else {
    const mode = u.searchParams.get('mode') || undefined;
    const ctx = u.searchParams.get('context') || undefined;
    const msgs = u.searchParams.get('messages');
    let messages: any[] | undefined = undefined;
    if (msgs) {
      try { messages = JSON.parse(msgs); } catch {}
    }
    payload = { mode, context: ctx, messages };
  }
  return handle(req, payload);
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  return handle(req, payload);
}

export async function OPTIONS() {
  return corsify(new Response(null, { status: 204 }));
}

export async function HEAD() {
  return corsify(new Response(null, { status: 200 }));
}
