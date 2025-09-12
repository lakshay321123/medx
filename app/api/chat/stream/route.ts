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
    for (let i = 0; i < ks.length; i++) h.set(ks[i], String(extra[ks[i]]));
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
  if (Date.now() > hit.exp) { verdictCache.delete(key); return undefined; }
  return hit.v;
}
function cacheSet(key: string, v: Verdict, ttlMs: number) {
  verdictCache.set(key, { v, exp: Date.now() + ttlMs });
}

// Keep doc-mode clinical prelude tight and relevant
function filterComputedForDocMode(items: any[], latestUser: string) {
  const msg = (latestUser || '').toLowerCase();
  const mentions = (s: string) => msg.indexOf(s) >= 0;
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

// ---------- deterministic composer (server-built, no model math) ----------
function getNum(...vals: any[]): number | undefined {
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}
function findVal(blended: any[], id: string): { value?: number | string, unit?: string } {
  for (let i = 0; i < blended.length; i++) {
    const r = blended[i];
    if (r && r.id === id) return { value: r.value, unit: r.unit };
  }
  return {};
}
function fmt(x: any, d: number = 2): string {
  if (!Number.isFinite(Number(x))) return String(x);
  const n = Number(x);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  return n.toFixed(d);
}
function composeFinalNarrative(ctx: Record<string, any>, blended: any[]): string {
  const Na = getNum(ctx.Na, ctx.na, ctx.sodium);
  const K  = getNum(ctx.K, ctx.k, ctx.potassium);
  const Cl = getNum(ctx.Cl, ctx.cl, ctx.chloride);
  const H  = getNum(ctx.HCO3, ctx.bicarb, ctx.bicarbonate);
  const Glu = getNum(ctx.Glucose, ctx.glucose, ctx.glucose_mg_dl, ctx.glucose_mgdl);
  const BUN = getNum(ctx.BUN, ctx.bun);
  const Cr  = getNum(ctx.Cr, ctx.creatinine);
  const Alb = getNum(ctx.Albumin, ctx.albumin);
  const pH  = getNum(ctx.pH);
  const pCO2 = getNum(ctx.pCO2, ctx.pco2, ctx.PaCO2);

  const ag         = findVal(blended, 'anion_gap').value;
  const ag_corr    = findVal(blended, 'anion_gap_albumin_corrected').value;
  const osm_calc   = findVal(blended, 'serum_osm_calc').value;
  const osm_gap    = findVal(blended, 'osmolar_gap').value;
  const eff_osm    = findVal(blended, 'effective_osm').value;
  const dka_sev    = findVal(blended, 'dka_severity').value;
  const hhs_flags  = findVal(blended, 'hhs_flags').value;
  const tonic      = findVal(blended, 'hyponatremia_tonicity').value;
  const k_sev      = findVal(blended, 'hyperkalemia_severity').value;
  const k_stat     = findVal(blended, 'potassium_status').value;

  let wintersExp: number | undefined = undefined;
  if (H !== undefined) { wintersExp = 1.5 * H + 8; } // Winters expected pCO2

  let respNote = '';
  if (wintersExp !== undefined && pCO2 !== undefined) {
    const lo = wintersExp - 2;
    const hi = wintersExp + 2;
    if (pCO2 > hi) respNote = 'concurrent respiratory acidosis';
    else if (pCO2 < lo) respNote = 'concurrent respiratory alkalosis';
    else respNote = 'appropriate respiratory compensation';
  }

  // Acid–base headline
  let acidBase = '';
  if (pH !== undefined && H !== undefined) {
    if (pH < 7.35 && H <= 22) acidBase = 'high anion gap metabolic acidosis';
    else if (pH < 7.35) acidBase = 'acidemia';
    else if (pH > 7.45) acidBase = 'alkalemia';
  }

  // DKA/HHS logic (conservative)
  let dkaFlag = '';
  if (Glu !== undefined && H !== undefined && pH !== undefined) {
    if (Glu >= 250 && (H <= 18 || pH < 7.30)) dkaFlag = 'meets biochemical criteria for DKA (hyperglycemia with acidosis)';
  }
  let hhsFlag = '';
  if (Number.isFinite(Number(eff_osm)) && Number(eff_osm) >= 320) hhsFlag = 'meets hyperosmolar threshold (HHS criteria)';

  // Sodium classification
  let naLine = '';
  if (Na !== undefined) {
    if (Na < 125) naLine = 'severe hyponatremia';
    else if (Na < 130) naLine = 'moderate hyponatremia';
    else if (Na < 135) naLine = 'mild hyponatremia';
    else if (Na > 145) naLine = 'hypernatremia';
  }

  // Potassium classification
  let kLine = '';
  if (K !== undefined) {
    if (K >= 6.0) kLine = 'dangerous hyperkalemia';
    else if (K >= 5.1) kLine = 'hyperkalemia';
    else if (K < 3.5) kLine = 'hypokalemia';
  }

  // Build narrative (verbatim source of truth)
  const lines: string[] = [];

  lines.push('Clinical summary (verified):');

  // Electrolytes
  const el: string[] = [];
  if (Na !== undefined) el.push('Na ' + fmt(Na));
  if (K !== undefined)  el.push('K ' + fmt(K));
  if (Cl !== undefined) el.push('Cl ' + fmt(Cl));
  if (H !== undefined)  el.push('HCO3 ' + fmt(H));
  if (Glu !== undefined) el.push('Glucose ' + fmt(Glu));
  if (BUN !== undefined) el.push('BUN ' + fmt(BUN));
  if (Cr !== undefined)  el.push('Cr ' + fmt(Cr));
  if (Alb !== undefined) el.push('Albumin ' + fmt(Alb));
  if (pH !== undefined)  el.push('pH ' + fmt(pH, 2));
  if (pCO2 !== undefined) el.push('pCO2 ' + fmt(pCO2));
  lines.push('- Labs: ' + el.join(', '));

  // Derived values
  const dv: string[] = [];
  if (ag !== undefined) dv.push('Anion gap ' + String(ag));
  if (ag_corr !== undefined) dv.push('AG (albumin-corrected) ' + String(ag_corr));
  if (osm_calc !== undefined) dv.push('Serum osmolality (calc) ' + String(osm_calc));
  if (eff_osm !== undefined) dv.push('Effective osmolality ' + String(eff_osm));
  if (osm_gap !== undefined) dv.push('Osmolar gap ' + String(osm_gap));
  if (wintersExp !== undefined) dv.push('Winter’s expected pCO2 ' + fmt(wintersExp));
  lines.push('- Derived: ' + dv.join(', '));

  // Interpretations
  const it: string[] = [];
  if (acidBase) it.push(acidBase);
  if (respNote) it.push(respNote);
  if (naLine) it.push(naLine);
  if (kLine) it.push(kLine);
  if (k_sev) it.push(String(k_sev));
  if (k_stat) it.push(String(k_stat));
  if (dkaFlag) it.push(dkaFlag);
  if (hhsFlag) it.push(hhsFlag);
  if (tonic) it.push(String(tonic));
  lines.push('- Interpretation: ' + (it.length ? it.join('; ') : 'insufficient data for risk scores; skip qSOFA/SIRS/NEWS2/CURB-65 without full vitals.'));

  // Safety rules line (concise, for transparency to composer)
  lines.push('Rules applied: AG = Na − (Cl + HCO3); AG-corr = AG + 2.5×(4 − albumin); Serum Osm = 2×Na + Glucose/18 + BUN/2.8; Effective Osm = 2×Na + Glucose/18; Winter’s expected pCO2 = 1.5×HCO3 + 8 (±2); no non-standard metrics.');

  return lines.join('\n');
}
// ---------------------------------------------------------------------------

async function handle(req: NextRequest, payload: any) {
  const method = req.method || 'GET';
  const messages = Array.isArray(payload && payload.messages) ? payload.messages : [];
  const context = payload && payload.context;
  const clientRequestId = payload && payload.clientRequestId;
  const mode = payload && payload.mode;

  // dedupe by clientRequestId for 60s
  const now = Date.now();
  for (const [id, ts] of Array.from(recentReqs.entries())) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const tsPrev = recentReqs.get(clientRequestId);
    if (tsPrev && now - tsPrev < 60_000) return corsify(new Response(null, { status: 409 }), { 'X-Chat-Route-Method': method });
    recentReqs.set(clientRequestId, now);
  }

  // Groq compose endpoint
  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY || '';
  const url   = base.replace(/\/$/, '') + '/chat/completions';

  // remove incoming system prompts
  const finalMessages: any[] = [];
  for (let i = 0; i < messages.length; i++) if (messages[i] && messages[i].role !== 'system') finalMessages.push(messages[i]);

  // gather user text for extraction
  let userText = '';
  const onlyUsers: any[] = [];
  for (let i = 0; i < finalMessages.length; i++) if (finalMessages[i].role === 'user') onlyUsers.push(finalMessages[i]);
  for (let i = 0; i < onlyUsers.length; i++) userText += String(onlyUsers[i]?.content ?? '') + '\n';
  const latestUserMessage = onlyUsers.length ? String(onlyUsers[onlyUsers.length - 1].content || '') : '';

  // calculators
  const ctx = extractAll(userText);
  const computed = computeAll(ctx);
  const taskMode = computed && computed.length ? 'analyzing' : 'thinking';

  // joint decision rules (base system)
  const JOINT_RULES = 'JOINT DECISION PROTOCOL:\n' +
    'You and the Calculators work together.\n' +
    'Treat calculator outputs as a first pass and correct edge or missing-input errors.\n' +
    'Cross-check physiology: Winters expected pCO2, osmolality 275-295 normal, albumin-corrected anion gap, potassium bands, renal flags.\n' +
    'If conflict exists, use your corrected values.\n' +
    'Be decisive; calculators are data, not directives.\n' +
    'Do not output any verification badge or correction line to the user.';
  finalMessages.unshift({ role: 'system', content: JOINT_RULES });

  // OpenAI verify first (1 minute), cached 10 minutes by ctx signature
  const cacheKey = await sha256Hex(JSON.stringify({ ctx, ver: 'v1' }));
  let verdict = cacheGet(cacheKey);
  if (!verdict) {
    const convo: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < finalMessages.length; i++) convo.push({ role: finalMessages[i].role, content: finalMessages[i].content });
    verdict = await verifyWithOpenAI({ mode: String(mode || 'default'), ctx, computed, conversation: convo, timeoutMs: 60_000 }) || undefined;
    if (verdict) cacheSet(cacheKey, verdict, 10 * 60 * 1000);
  }

  // overlay corrections: GPT-5 wins
  let blended = computed.slice();
  if (verdict && verdict.corrected_values && typeof verdict.corrected_values === 'object') {
    const byId = new Map<string, any>();
    for (let i = 0; i < blended.length; i++) if (blended[i] && blended[i].id) byId.set(String(blended[i].id), blended[i]);
    const keys = Object.keys(verdict.corrected_values);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v: any = (verdict.corrected_values as any)[k];
      const t = byId.get(k);
      if (t) {
        if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'value')) {
          const vkeys = Object.keys(v);
          for (let j = 0; j < vkeys.length; j++) (t as any)[vkeys[j]] = (v as any)[vkeys[j]];
        } else (t as any).value = v;
        const existingNotes = Array.isArray((t as any).notes) ? (t as any).notes : [];
        const newNotes = v && Array.isArray(v.notes) ? v.notes : [];
        const memo = new Map<string, boolean>();
        for (let j = 0; j < existingNotes.length; j++) memo.set(String(existingNotes[j]), true);
        for (let j = 0; j < newNotes.length; j++) memo.set(String(newNotes[j]), true);
        const mergedNotes = Array.from(memo.keys());
        if (mergedNotes.length) (t as any).notes = mergedNotes;
      } else {
        const entry: any = { id: k, label: k, value: undefined, unit: undefined, notes: undefined };
        if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'value')) {
          entry.value = v.value;
          if (v.unit) entry.unit = v.unit;
          if (Array.isArray(v.notes)) entry.notes = v.notes.slice();
        } else entry.value = v;
        byId.set(k, entry);
      }
    }
    blended = Array.from(byId.values());
  }

  // doctor/research prelude (optional, for doc mode UI only)
  const showPrelude = (mode === 'doctor') || (mode === 'research') || /trial|research/i.test(String(mode || ''));
  if (showPrelude) {
    const crisisToNum = (x: any) => typeof x === 'number' ? x : Number(x);
    const g = crisisToNum((ctx as any).glucose ?? (ctx as any).glucose_mg_dl ?? (ctx as any).glucose_mgdl);
    const bicarb = crisisToNum((ctx as any).HCO3 ?? (ctx as any).bicarb ?? (ctx as any).bicarbonate);
    const ph = crisisToNum((ctx as any).pH);
    const kVal = crisisToNum((ctx as any).K ?? (ctx as any).potassium);
    const hyperglycemicCrisis = (Number.isFinite(g) && g >= 250) && ((Number.isFinite(bicarb) && bicarb <= 18) || (Number.isFinite(ph) && ph < 7.30));
    const hyperkalemiaDanger = Number.isFinite(kVal) && kVal >= 6.0;

    const mustShow = new Set<string>([
      'measured_osm_status', 'osmolar_gap', 'serum_osm_calc', 'anion_gap_albumin_corrected',
      'hyponatremia_tonicity', 'hyperkalemia_severity', 'potassium_status', 'dka_severity', 'hhs_flags'
    ]);
    const promoted: any[] = [];
    for (let i = 0; i < blended.length; i++) if (blended[i] && mustShow.has(blended[i].id)) promoted.push(blended[i]);
    const crisisPromoted = (hyperglycemicCrisis || hyperkalemiaDanger) ? promoted : [];

    const filtered = filterComputedForDocMode(blended, latestUserMessage || '');
    const merged: any[] = [];
    for (let i = 0; i < crisisPromoted.length; i++) merged.push(crisisPromoted[i]);
    for (let i = 0; i < filtered.length; i++) merged.push(filtered[i]);

    const mapById = new Map<string, any>();
    for (let i = 0; i < merged.length; i++) if (merged[i] && merged[i].id && !mapById.has(merged[i].id)) mapById.set(String(merged[i].id), merged[i]);

    const linesArr: string[] = [];
    const valuesArr = Array.from(mapById.values());
    for (let i = 0; i < valuesArr.length; i++) {
      const r = valuesArr[i];
      const val = r.unit ? String(r.value) + ' ' + String(r.unit) : String(r.value);
      const notesLine = Array.isArray(r.notes) && r.notes.length ? ' — ' + r.notes.join('; ') : '';
      linesArr.push(String(r.label || r.id) + ': ' + val + notesLine);
    }
    if (linesArr.length) finalMessages.unshift({ role: 'system', content: linesArr.join('\n') });

    const calcPrelude = composeCalcPrelude(latestUserMessage || '');
    if (calcPrelude && finalMessages.length && finalMessages[0]?.role === 'system') {
      finalMessages.unshift({ role: 'system', content: calcPrelude });
    }
  }

  // profile context (optional)
  if (context === 'profile') {
    try {
      const origin = req.nextUrl.origin;
      const headers = { cookie: req.headers.get('cookie') || '' };
      const sP = fetch(origin + '/api/profile/summary', { headers }).then(r => r.json()).catch(() => ({}));
      const pP = fetch(origin + '/api/profile', { headers }).then(r => r.json()).catch(() => null);
      const pkP = fetch(origin + '/api/profile/packet', { headers }).then(r => r.json()).catch(() => ({ text: '' }));
      const [s, p, pk] = await Promise.all([sP, pP, pkP]);
      const sys = profileChatSystem({
        summary: (s as any).summary || (s as any).text || '',
        reasons: (s as any).reasons || '',
        profile: (p as any)?.profile || (p as any) || null,
        packet: (pk as any).text || '',
      });
      finalMessages.unshift({ role: 'system', content: sys });
    } catch {}
  }

  // -------- Build final server-verified narrative and force verbatim echo --------
  const finalText = composeFinalNarrative(ctx, blended);

  const echoSystem = 'You are a transmitter. Output the following content verbatim, with no additions, omissions, or reformatting.';
  const echoUser = finalText;

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
      messages: [
        { role: 'system', content: echoSystem },
        { role: 'user', content: echoUser }
      ]
    }),
  });

  if (!upstream.ok) {
    const errTxt = await upstream.text();
    return corsify(new Response('LLM error (' + method + '): ' + errTxt, { status: 500 }), {
      'X-Task-Mode': (computed && computed.length) ? 'analyzing' : 'thinking',
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
      'X-Task-Mode': (computed && computed.length) ? 'analyzing' : 'thinking',
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
  if (payloadParam) { try { payload = JSON.parse(decodeURIComponent(payloadParam)); } catch { payload = {}; } }
  else {
    const mode = u.searchParams.get('mode') || undefined;
    const ctx = u.searchParams.get('context') || undefined;
    const msgs = u.searchParams.get('messages');
    let messages: any[] | undefined = undefined;
    if (msgs) { try { messages = JSON.parse(msgs); } catch {} }
    payload = { mode, context: ctx, messages };
  }
  return handle(req, payload);
}
export async function POST(req: NextRequest)  { const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function PUT(req: NextRequest)   { const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function PATCH(req: NextRequest) { const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function DELETE(req: NextRequest){ const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function OPTIONS() { return corsify(new Response(null, { status: 204 })); }
export async function HEAD()    { return corsify(new Response(null, { status: 200 })); }
