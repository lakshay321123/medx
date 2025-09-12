import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
import { verifyWithOpenAI, Verdict } from '@/lib/ai/verifyWithOpenAI';
import { composeCalcPrelude } from '@/lib/medical/engine/prelude';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function corsify(res: Response, extra?: Record<string, string>) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  h.set('Cache-Control', 'no-store');
  if (extra) {
    const ks = Object.keys(extra);
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      h.set(k, String(extra[k]));
    }
  }
  return new Response(res.body, { status: res.status, headers: h });
}

const recentReqs = new Map<string, number>();
const verdictCache = new Map<string, { v: Verdict; exp: number }>();

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
  verdictCache.set(key, { v: v, exp: Date.now() + ttlMs });
}

// Keep doc-mode clinical prelude tight and relevant
function filterComputedForDocMode(items: any[], latestUser: string) {
  const msg = (latestUser || '').toLowerCase();
  const mentions = function (s: string) { return msg.indexOf(s) >= 0; };
  const isResp = mentions('cough') || mentions('fever') || mentions('cold') || mentions('breath') || mentions('sore throat');
  const needsPE = mentions('chest pain') || mentions('pleur') || mentions('shortness of breath') || /\bsob\b/.test(msg);

  const out: any[] = [];
  for (let i = 0; i < (items ? items.length : 0); i++) {
    const r = items[i];
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

async function handle(req: NextRequest, payload: any) {
  const method = req.method || 'GET';
  const messages = Array.isArray(payload && payload.messages) ? payload.messages : [];
  const context = payload && payload.context;
  const clientRequestId = payload && payload.clientRequestId;
  const mode = payload && payload.mode;

  // dedupe by clientRequestId for 60s
  const now = Date.now();
  const entries = Array.from(recentReqs.entries());
  for (let i = 0; i < entries.length; i++) {
    const id = entries[i][0];
    const ts = entries[i][1];
    if (now - ts > 60_000) recentReqs.delete(id);
  }
  if (clientRequestId) {
    const tsPrev = recentReqs.get(clientRequestId);
    if (tsPrev && now - tsPrev < 60_000) {
      return corsify(new Response(null, { status: 409 }), { 'X-Chat-Route-Method': method });
    }
    recentReqs.set(clientRequestId, now);
  }

  // Groq compose endpoint
  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY || '';
  const url   = (base.replace(/\/$/, '')) + '/chat/completions';

  // remove incoming system prompts
  const finalMessages: any[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m && m.role !== 'system') finalMessages.push(m);
  }

  // gather user text for extraction
  let userText = '';
  const onlyUsers: any[] = [];
  for (let i = 0; i < finalMessages.length; i++) {
    const m = finalMessages[i];
    if (m.role === 'user') onlyUsers.push(m);
  }
  for (let i = 0; i < onlyUsers.length; i++) {
    const u = onlyUsers[i];
    userText += String(u && u.content ? u.content : '') + '\n';
  }
  const latestUserMessage = onlyUsers.length ? String(onlyUsers[onlyUsers.length - 1].content || '') : '';

  // calculators
  const ctx = extractAll(userText);
  const computed = computeAll(ctx);
  const taskMode = computed && computed.length ? 'analyzing' : 'thinking';

  // joint decision rules
  const JOINT_RULES = 'JOINT DECISION PROTOCOL:\n' +
    'You and the Calculators work together.\n' +
    'Treat calculator outputs as a first pass and correct edge or missing-input errors.\n' +
    'Cross-check physiology: Winters expected pCO2, osmolality 275-295 normal, albumin-corrected anion gap, potassium bands, renal flags.\n' +
    'If conflict exists, use your corrected values.\n' +
    'Be decisive; calculators are data, not directives.\n' +
    'Do not output any verification badge or correction line to the user.';

  finalMessages.unshift({ role: 'system', content: JOINT_RULES });

  // OpenAI verify first (1 minute), cached 10 minutes by ctx signature
  const cacheKey = await sha256Hex(JSON.stringify({ ctx: ctx, ver: 'v1' }));
  let verdict = cacheGet(cacheKey);
  if (!verdict) {
    const convo: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < finalMessages.length; i++) {
      const m = finalMessages[i];
      convo.push({ role: m.role, content: m.content });
    }
    verdict = await verifyWithOpenAI({
      mode: String(mode || 'default'),
      ctx: ctx,
      computed: computed,
      conversation: convo,
      timeoutMs: 60_000
    }) || undefined;
    if (verdict) cacheSet(cacheKey, verdict, 10 * 60 * 1000);
  }

  // overlay corrections: GPT-5 wins
  let blended = computed.slice();
  if (verdict && verdict.corrected_values && typeof verdict.corrected_values === 'object') {
    const byId = new Map<string, any>();
    for (let i = 0; i < blended.length; i++) {
      const r = blended[i];
      if (r && r.id) byId.set(String(r.id), r);
    }

    const keys = Object.keys(verdict.corrected_values);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v: any = (verdict.corrected_values as any)[k];
      const t = byId.get(k);
      if (t) {
        if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'value')) {
          const vkeys = Object.keys(v);
          for (let j = 0; j < vkeys.length; j++) {
            const prop = vkeys[j];
            (t as any)[prop] = (v as any)[prop];
          }
        } else {
          (t as any).value = v;
        }
        const existingNotes = Array.isArray((t as any).notes) ? (t as any).notes : [];
        const newNotes = v && Array.isArray(v.notes) ? v.notes : [];
        const mergedNotesMap = new Map<string, boolean>();
        for (let j = 0; j < existingNotes.length; j++) mergedNotesMap.set(String(existingNotes[j]), true);
        for (let j = 0; j < newNotes.length; j++) mergedNotesMap.set(String(newNotes[j]), true);
        const mergedNotes = Array.from(mergedNotesMap.keys());
        if (mergedNotes.length) (t as any).notes = mergedNotes;
      } else {
        const entry: any = { id: k, label: k, value: undefined, unit: undefined, notes: undefined };
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

  // crisis promotion cues (from inputs)
  const toNum = function (x: any) { return typeof x === 'number' ? x : Number(x); };
  const g = toNum(ctx && ctx.glucose !== undefined ? ctx.glucose : ctx && ctx.glucose_mg_dl);
  const bicarb = toNum(ctx && ctx.HCO3 !== undefined ? ctx.HCO3 : (ctx && ctx.bicarb !== undefined ? ctx.bicarb : ctx && ctx.bicarbonate));
  const ph = toNum(ctx && ctx.pH);
  const kVal = toNum(ctx && ctx.K !== undefined ? ctx.K : ctx && ctx.potassium);
  const hyperglycemicCrisis = (Number.isFinite(g) && g >= 250) && ((Number.isFinite(bicarb) && bicarb <= 18) || (Number.isFinite(ph) && ph < 7.30));
  const hyperkalemiaDanger = Number.isFinite(kVal) && kVal >= 6.0;

  const mustShow = new Set<string>([
    'measured_osm_status', 'osmolar_gap', 'serum_osm_calc', 'anion_gap_albumin_corrected',
    'hyponatremia_tonicity', 'hyperkalemia_severity', 'potassium_status', 'dka_severity', 'hhs_flags'
  ]);
  const promoted: any[] = [];
  for (let i = 0; i < blended.length; i++) {
    const r = blended[i];
    if (r && mustShow.has(r.id)) promoted.push(r);
  }
  const crisisPromoted = (hyperglycemicCrisis || hyperkalemiaDanger) ? promoted : [];

  // doctor/research prelude
  const showPrelude = (mode === 'doctor') || (mode === 'research') || /trial|research/i.test(String(mode || ''));
  if (showPrelude) {
    const filtered = filterComputedForDocMode(blended, latestUserMessage || '');
    const merged: any[] = [];
    for (let i = 0; i < crisisPromoted.length; i++) merged.push(crisisPromoted[i]);
    for (let i = 0; i < filtered.length; i++) merged.push(filtered[i]);

    const mapById = new Map<string, any>();
    for (let i = 0; i < merged.length; i++) {
      const r = merged[i];
      if (r && r.id && !mapById.has(r.id)) mapById.set(String(r.id), r);
    }

    const linesArr: string[] = [];
    const valuesArr = Array.from(mapById.values());
    for (let i = 0; i < valuesArr.length; i++) {
      const r = valuesArr[i];
      const val = r.unit ? String(r.value) + ' ' + String(r.unit) : String(r.value);
      const notesLine = Array.isArray(r.notes) && r.notes.length ? ' — ' + r.notes.join('; ') : '';
      linesArr.push(String(r.label || r.id) + ': ' + val + notesLine);
    }
    if (linesArr.length) {
      finalMessages.unshift({ role: 'system', content: linesArr.join('\n') });
    }
  }

  // optional calc prelude if we actually added computed lines just above
  const calcPrelude = composeCalcPrelude(latestUserMessage || '');
  if (showPrelude && calcPrelude && finalMessages.length && finalMessages[0] && (finalMessages[0] as any).role === 'system') {
    finalMessages.unshift({ role: 'system', content: calcPrelude });
  }

  // profile context
  if (context === 'profile') {
    try {
      const origin = req.nextUrl.origin;
      const headers = { cookie: req.headers.get('cookie') || '' };
      const sP = fetch(origin + '/api/profile/summary', { headers: headers }).then(function (r) { return r.json(); }).catch(function () { return {}; });
      const pP = fetch(origin + '/api/profile', { headers: headers }).then(function (r) { return r.json(); }).catch(function () { return null; });
      const pkP = fetch(origin + '/api/profile/packet', { headers: headers }).then(function (r) { return r.json(); }).catch(function () { return { text: '' }; });
      const arr = await Promise.all([sP, pP, pkP]);
      const s = arr[0] as any;
      const p = arr[1] as any;
      const pk = arr[2] as any;
      const sys = profileChatSystem({
        summary: s && (s.summary || s.text) ? (s.summary || s.text) : '',
        reasons: s && s.reasons ? s.reasons : '',
        profile: p && (p.profile || p) ? (p.profile || p) : null,
        packet: pk && pk.text ? pk.text : '',
      });
      finalMessages.unshift({ role: 'system', content: sys });
    } catch {}
  }

  // call Groq and stream
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: model,
      stream: true,
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages: finalMessages
    }),
  });

  if (!upstream.ok) {
    const errTxt = await upstream.text();
    return corsify(new Response('LLM error (' + method + '): ' + errTxt, { status: 500 }), {
      'X-Task-Mode': taskMode,
      'X-Verify-Timeout': '60000',
      'X-Verify-Used': verdict ? '1' : '0',
      'X-Chat-Route-Method': method
    });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'X-Task-Mode': taskMode,
      'X-Verify-Timeout': '60000',
      'X-Verify-Used': verdict ? '1' : '0',
      'X-Chat-Route-Method': method
    },
  });
}

// GET supports ?payload=<json> or legacy query params
export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const payloadParam = u.searchParams.get('payload');
  let payload: any = {};
  if (payloadParam) {
    try { payload = JSON.parse(decodeURIComponent(payloadParam)); } catch { payload = {}; }
  } else {
    const mode = u.searchParams.get('mode') || undefined;
    const ctx = u.searchParams.get('context') || undefined;
    const msgs = u.searchParams.get('messages');
    let messages: any[] | undefined = undefined;
    if (msgs) { try { messages = JSON.parse(msgs); } catch {} }
    payload = { mode: mode, context: ctx, messages: messages };
  }
  return handle(req, payload);
}
export async function POST(req: NextRequest)  { const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function PUT(req: NextRequest)   { const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function PATCH(req: NextRequest) { const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function DELETE(req: NextRequest){ const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function OPTIONS() { return corsify(new Response(null, { status: 204 })); }
export async function HEAD()    { return corsify(new Response(null, { status: 200 })); }
