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

// Keep doc-mode clinical prelude tight & relevant
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

/* ----------------------- Deterministic server math ----------------------- */
function num(...vals: any[]): number | undefined {
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}
function round(x: number, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(x * f) / f;
}
function fmt(x: any, d = 2): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  return n.toFixed(d);
}
type Derived = {
  AG?: number;
  AGcorr?: number;
  OsmCalc?: number;
  EffOsm?: number;
  OsmGap?: number;
  Winters?: number;
  respNote?: string;
  dkaFlag?: string;
  hhsFlag?: string;
  acidBase?: string;
  naNote?: string;
  kNote?: string;
};
function computeDerived(ctx: Record<string, any>): Derived {
  const Na = num(ctx.Na, ctx.na, ctx.sodium);
  const K = num(ctx.K, ctx.k, ctx.potassium);
  const Cl = num(ctx.Cl, ctx.cl, ctx.chloride);
  const HCO3 = num(ctx.HCO3, ctx.bicarb, ctx.bicarbonate);
  const Glu = num(ctx.Glucose, ctx.glucose, ctx.glucose_mg_dl, ctx.glucose_mgdl);
  const BUN = num(ctx.BUN, ctx.bun);
  const Alb = num(ctx.Albumin, ctx.albumin);
  const OsmMeasured = num(ctx.Osm_measured, ctx.osm_measured, ctx.measured_osm, ctx.osm_meas);
  const pH = num(ctx.pH);
  const pCO2 = num(ctx.pCO2, ctx.pco2, ctx.PaCO2);

  const out: Derived = {};

  // Core formulas (no creatinine; no K in AG)
  if (Na !== undefined && Cl !== undefined && HCO3 !== undefined) {
    out.AG = round(Na - (Cl + HCO3), 2);
    if (Alb !== undefined) out.AGcorr = round(out.AG + 2.5 * (4 - Alb), 2);
  }
  if (Na !== undefined) {
    if (Glu !== undefined && BUN !== undefined) out.OsmCalc = round(2 * Na + Glu / 18 + BUN / 2.8, 2);
    if (Glu !== undefined) out.EffOsm = round(2 * Na + Glu / 18, 2);
  }
  if (OsmMeasured !== undefined && out.OsmCalc !== undefined)
    out.OsmGap = round(OsmMeasured - out.OsmCalc, 2);

  if (HCO3 !== undefined) {
    out.Winters = round(1.5 * HCO3 + 8, 2);
    if (pCO2 !== undefined) {
      const lo = out.Winters - 2;
      const hi = out.Winters + 2;
      if (pCO2 > hi) out.respNote = 'concurrent respiratory acidosis';
      else if (pCO2 < lo) out.respNote = 'concurrent respiratory alkalosis';
      else out.respNote = 'appropriate respiratory compensation';
    }
  }

  // Acid–base headline (do not assume "high AG" unless AG/AGcorr elevated)
  if (pH !== undefined && HCO3 !== undefined) {
    if (pH < 7.35 && HCO3 <= 22) {
      if ((out.AGcorr ?? out.AG ?? 0) > 12) out.acidBase = 'high anion gap metabolic acidosis';
      else out.acidBase = 'metabolic acidosis';
    } else if (pH < 7.35) out.acidBase = 'acidemia';
    else if (pH > 7.45) out.acidBase = 'alkalemia';
  }

  // DKA / HHS gates
  if (Glu !== undefined && HCO3 !== undefined && pH !== undefined) {
    if (Glu >= 250 && (HCO3 <= 18 || pH < 7.30)) out.dkaFlag = 'meets biochemical criteria for DKA';
  }
  if ((out.EffOsm !== undefined && out.EffOsm >= 320) || (OsmMeasured !== undefined && OsmMeasured >= 320)) {
    out.hhsFlag = 'meets hyperosmolar threshold (HHS criteria)';
  }

  // Sodium and potassium notes
  if (Na !== undefined) {
    if (Na < 125) out.naNote = 'severe hyponatremia';
    else if (Na < 130) out.naNote = 'moderate hyponatremia';
    else if (Na < 135) out.naNote = 'mild hyponatremia';
    else if (Na > 145) out.naNote = 'hypernatremia';
  }
  if (K !== undefined) {
    if (K >= 6.0) out.kNote = 'dangerous hyperkalemia';
    else if (K >= 5.1) out.kNote = 'hyperkalemia';
    else if (K < 3.5) out.kNote = 'hypokalemia';
  }

  return out;
}
function composeFinalNarrative(ctx: Record<string, any>): string {
  const Na = num(ctx.Na, ctx.na, ctx.sodium);
  const K  = num(ctx.K, ctx.k, ctx.potassium);
  const Cl = num(ctx.Cl, ctx.cl, ctx.chloride);
  const H  = num(ctx.HCO3, ctx.bicarb, ctx.bicarbonate);
  const Glu = num(ctx.Glucose, ctx.glucose, ctx.glucose_mg_dl, ctx.glucose_mgdl);
  const BUN = num(ctx.BUN, ctx.bun);
  const Cr  = num(ctx.Cr, ctx.creatinine);
  const Alb = num(ctx.Albumin, ctx.albumin);
  const pH  = num(ctx.pH);
  const pCO2 = num(ctx.pCO2, ctx.pco2, ctx.PaCO2);
  const OsmMeasured = num(ctx.Osm_measured, ctx.osm_measured, ctx.measured_osm, ctx.osm_meas);

  const d = computeDerived(ctx);

  const lines: string[] = [];
  lines.push('Clinical summary (verified):');

  // Labs
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
  if (OsmMeasured !== undefined) el.push('Osm (measured) ' + fmt(OsmMeasured));
  lines.push('- Labs: ' + (el.length ? el.join(', ') : 'not provided'));

  // Derived
  const dv: string[] = [];
  if (d.AG !== undefined) dv.push('Anion gap ' + fmt(d.AG));
  if (d.AGcorr !== undefined) dv.push('AG (albumin-corrected) ' + fmt(d.AGcorr));
  if (d.OsmCalc !== undefined) dv.push('Serum osmolality (calc) ' + fmt(d.OsmCalc));
  if (d.EffOsm !== undefined) dv.push('Effective osmolality ' + fmt(d.EffOsm));
  if (d.OsmGap !== undefined) dv.push('Osmolar gap ' + fmt(d.OsmGap));
  if (d.Winters !== undefined) dv.push('Winter’s expected pCO2 ' + fmt(d.Winters));
  lines.push('- Derived: ' + (dv.length ? dv.join(', ') : 'not computable with given inputs'));

  // Interpretation (conservative)
  const it: string[] = [];
  if (d.acidBase) it.push(d.acidBase);
  if (d.respNote) it.push(d.respNote);
  if (d.naNote) it.push(d.naNote);
  if (d.kNote) it.push(d.kNote);
  if (d.dkaFlag) it.push(d.dkaFlag);
  if (d.hhsFlag) it.push(d.hhsFlag);
  lines.push('- Interpretation: ' + (it.length ? it.join('; ') : 'insufficient inputs for risk scores; do not compute qSOFA/SIRS/NEWS2/CURB-65 without full vitals.'));

  // Rules
  lines.push('Rules applied: AG = Na − (Cl + HCO3); AG-corr = AG + 2.5×(4 − albumin); Serum Osm = 2×Na + Glucose/18 + BUN/2.8; Effective Osm = 2×Na + Glucose/18; Winter’s expected pCO2 = 1.5×HCO3 + 8 (±2); no non-standard metrics.');

  return lines.join('\n');
}
/* ------------------------------------------------------------------------ */

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

  // Groq endpoint (composer)
  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY || '';
  const url   = base.replace(/\/$/, '') + '/chat/completions';

  // strip user-supplied system
  const finalMessages: any[] = [];
  for (let i = 0; i < messages.length; i++) if (messages[i] && messages[i].role !== 'system') finalMessages.push(messages[i]);

  // extract inputs
  let userText = '';
  const onlyUsers: any[] = [];
  for (let i = 0; i < finalMessages.length; i++) if (finalMessages[i].role === 'user') onlyUsers.push(finalMessages[i]);
  for (let i = 0; i < onlyUsers.length; i++) userText += String(onlyUsers[i]?.content ?? '') + '\n';
  const latestUserMessage = onlyUsers.length ? String(onlyUsers[onlyUsers.length - 1].content || '') : '';

  const ctx = extractAll(userText);
  const computed = computeAll(ctx);
  const taskMode = computed && computed.length ? 'analyzing' : 'thinking';

  // baseline joint rules (for doc mode or logs; not sent to composer)
  const JOINT_RULES = 'JOINT DECISION PROTOCOL:\n' +
    'You and the Calculators work together.\n' +
    'Treat calculator outputs as a first pass and correct edge or missing-input errors.\n' +
    'Cross-check physiology: Winters expected pCO2, osmolality 275-295 normal, albumin-corrected anion gap, potassium bands, renal flags.\n' +
    'If conflict exists, use your corrected values.\n' +
    'Be decisive; calculators are data, not directives.\n' +
    'Do not output any verification badge or correction line to the user.';
  finalMessages.unshift({ role: 'system', content: JOINT_RULES });

  // OpenAI verify (GPT-5) with cache
  const cacheKey = await sha256Hex(JSON.stringify({ ctx, ver: 'v1' }));
  let verdict = cacheGet(cacheKey);
  if (!verdict) {
    const convo: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < finalMessages.length; i++) convo.push({ role: finalMessages[i].role, content: finalMessages[i].content });
    verdict = await verifyWithOpenAI({ mode: String(mode || 'default'), ctx, computed, conversation: convo, timeoutMs: 60_000 }) || undefined;
    if (verdict) cacheSet(cacheKey, verdict, 10 * 60 * 1000);
  }

  // (We still overlay in case you surface verified calculator rows elsewhere)
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

  // optional doc/research prelude
  const showPrelude = (mode === 'doctor') || (mode === 'research') || /trial|research/i.test(String(mode || ''));
  if (showPrelude) {
    const g = Number(ctx.glucose ?? ctx.glucose_mg_dl ?? ctx.glucose_mgdl);
    const bicarb = Number(ctx.HCO3 ?? ctx.bicarb ?? ctx.bicarbonate);
    const ph = Number(ctx.pH);
    const kVal = Number(ctx.K ?? ctx.potassium);
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

  // Optional profile context
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

  // Build final server-verified narrative and force verbatim echo
  const finalText = composeFinalNarrative(ctx);
  const echoSystem = 'You are a transmitter. Output the following content verbatim, with no additions, omissions, reformatting, or explanations.';
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
