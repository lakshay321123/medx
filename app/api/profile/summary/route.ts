export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { ensurePrimaryPatient } from "@/lib/patients";

const noStore = { "Cache-Control": "no-store, max-age=0" };

const STOPWORDS = [
  "PHYSICAL EXAMINATION",
  "VISUAL EXAMINATION",
  "QUANTITY",
  "SPECIMEN",
  "DEPARTMENT",
  "INVESTIGATION",
  "REMARK",
  "REFERENCE INTERVAL",
  "OBSERVED VALUE",
  "UNIT",
  "BIOLOGICAL",
];
const cues = /(mg|mcg|µg|g|iu|ml|tablet|tab|capsule|cap|syrup|injection|drop|ointment|cream|patch)\b/i;
const looksLikeMed = (s: string) =>
  /[A-Za-z]/.test(s) &&
  /\d/.test(s) &&
  cues.test(s) &&
  !STOPWORDS.some((w) => s.toUpperCase().includes(w));
const sanitizeMeds = (list: any[]): string[] =>
  Array.from(
    new Map(
      (list || [])
        .map((s: any) => String(s).replace(/\s+/g, " ").trim())
        .filter(looksLikeMed)
        .map((m: string) => [m.toLowerCase().replace(/[^a-z0-9]+/g, ""), m])
    ).values()
  );

const toTitle = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

function when(r: any) {
  return new Date(
    r.observed_at ||
      r.meta?.report_date ||
      r.details?.report_date ||
      r.meta?.observed_at ||
      r.details?.observed_at ||
      r.created_at ||
      0
  ).getTime();
}

function vStr(r: any) {
  const val = r.value ?? r.value_num ?? r.meta?.value ?? r.details?.value ?? r.meta?.value_num;
  const unit = r.unit ?? r.meta?.unit ?? r.details?.unit;
  return `${val ?? "?"}${unit ? ` ${unit}` : ""}`;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ text: "", reasons: "" }, { headers: noStore });

  const db = supabaseAdmin();
  const pRes = await db
    .from("profiles")
    .select("full_name,dob,sex,blood_group,chronic_conditions,conditions_predisposition")
    .eq("id", userId)
    .maybeSingle();

  let patientId: string | null = null;
  if (!pRes.error) {
    try {
      const patient = await ensurePrimaryPatient(db, userId, pRes.data ?? undefined);
      patientId = patient?.id ?? null;
    } catch (err: any) {
      return NextResponse.json(
        { text: "", reasons: "", error: err?.message || "patient_lookup_failed" },
        { headers: noStore, status: 500 }
      );
    }
  }

  const [oRes, prRes] = await Promise.all([
    db
      .from("observations")
      .select("*")
      .eq("user_id", userId)
      .eq('meta->>committed','true'),
    patientId
      ? db
          .from("predictions")
          .select(
            "id, generated_at, condition, risk_score, risk_label, top_factors, patient_summary_md, clinician_summary_md, summarizer_model, summarizer_error"
          )
          .eq("patient_id", patientId)
          .order("generated_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as any[], error: null } as any),
  ]);

  const asArray = (x: any) => Array.isArray(x) ? x : (typeof x === 'string' ? (()=>{ try { const p = JSON.parse(x); return Array.isArray(p) ? p : [] } catch { return [] } })() : []);
  const prof: any = pRes.data || {};
  prof.conditions_predisposition = asArray(prof.conditions_predisposition);
  prof.chronic_conditions        = asArray(prof.chronic_conditions);
  const obs: any[] = oRes.data || [];
  const pred = prRes.data?.[0];

  const age = prof.dob
    ? Math.floor((Date.now() - new Date(prof.dob).getTime()) / (365.25 * 864e5))
    : null;
  const patientName = prof.full_name ? toTitle(prof.full_name) : '—';
  const patientLine = `Patient: ${patientName} (${prof.sex || 'Unknown'}${
    age ? `, ${age} y` : ''
  }${prof.blood_group ? `, ${prof.blood_group}` : ''})`;

  const chronicArr = prof.chronic_conditions || [];
  const chronicLine = `Chronic Conditions: ${chronicArr.length ? chronicArr.join(', ') : '—'}`;

  const predisArr = prof.conditions_predisposition || [];
  const predisLine = `Predispositions: ${predisArr.length ? predisArr.join(', ') : '—'}`;

  const medsRaw = obs.flatMap((r: any) => {
    const m = r.meta || r.details || {};
    const list = m.meds || m.medicines || m.medications || [];
    return Array.isArray(list) ? list : typeof list === 'string' ? [list] : [];
  });
  const medsClean = sanitizeMeds(medsRaw);
  const medsLine = `Active Meds: ${
    medsClean.length
      ? medsClean.slice(0, 4).join('; ') +
        (medsClean.length > 4 ? `, +${medsClean.length - 4}` : '')
      : '—'
  }`;

  const textOf = (r: any) =>
    `${(r.name || '').toLowerCase()} ${JSON.stringify(r.meta || {}).toLowerCase()} ${JSON.stringify(
      r.details || {}
    ).toLowerCase()}`;
  const pickLatest = (rx: RegExp) =>
    obs.filter((r) => rx.test(textOf(r))).sort((a, b) => when(b) - when(a))[0];
  const reasons: string[] = [];
  const labsParts: string[] = [];
  const hb = pickLatest(/\bhba1c\b/i);
  if (hb) {
    const val = parseFloat(hb.value ?? hb.value_num ?? hb.meta?.value ?? hb.details?.value);
    labsParts.push(`HbA1c ${vStr(hb)}${val > 7 ? ' ↑' : ''}`);
    reasons.push(`HbA1c ${vStr(hb)}`);
  }
  const ldl = pickLatest(/\bldl\b/i);
  if (ldl) {
    const val = parseFloat(ldl.value ?? ldl.value_num ?? ldl.meta?.value ?? ldl.details?.value);
    labsParts.push(`LDL ${vStr(ldl)}${val > 100 ? ' ↑' : ''}`);
    reasons.push(`LDL ${vStr(ldl)}`);
  }
  const egfr = pickLatest(/\begfr\b/i);
  if (egfr) {
    const val = parseFloat(egfr.value ?? egfr.value_num ?? egfr.meta?.value ?? egfr.details?.value);
    labsParts.push(`eGFR ${vStr(egfr)}${val < 90 ? ' ↓' : ''}`);
    reasons.push(`eGFR ${vStr(egfr)}`);
  }
  const labsLine = `Recent Labs (latest): ${labsParts.length ? labsParts.join(', ') : '—'}`;

  let predLine = 'AI Prediction: —';
  if (pred) {
    const label = pred.condition || 'Prediction';
    const score = typeof pred.risk_score === 'number' ? Number(pred.risk_score) : null;
    const pct = score != null ? Math.round(score * 100) : null;
    const band = pred.risk_label || (pct != null ? (pct < 33 ? 'Low' : pct < 66 ? 'Moderate' : 'High') : '—');
    predLine = `AI Prediction: ${label}: ${band}${pct != null ? ` (${pct}%)` : ''}`;
    reasons.push(`Prediction: ${label}${pct != null ? ` ${pct}%` : ''}`);
    const factors = Array.isArray(pred.top_factors) ? pred.top_factors : [];
    for (const f of factors.slice(0, 3)) {
      if (f?.name) reasons.push(String(f.name));
    }
  }

  const notes = obs
    .filter((r) => /(note|symptom)/i.test(r.kind || r.name || ''))
    .sort((a, b) => when(b) - when(a))
    .slice(0, 2)
    .map((r) => (r.value_text || r.meta?.summary || r.meta?.text || '').toString().trim())
    .filter(Boolean);

  const nextSteps = '—';

  const uploadsCount = obs.length;
  const latestUpload = obs.map(when).sort((a, b) => b - a)[0];
  const latestDate = latestUpload
    ? new Date(latestUpload).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
  const uploadsLine = `Uploads: ${uploadsCount} (latest: ${latestDate})`;

  const lines = [
    patientLine,
    chronicLine,
    predisLine,
    medsLine,
    labsLine,
    predLine,
    `Symptoms/Notes: ${notes.length ? notes.join('; ') : '—'}`,
    `Next Steps: ${nextSteps}`,
    uploadsLine,
    'AI assistance only — not a medical diagnosis. Confirm with a clinician.',
  ].join('\n');

  return NextResponse.json(
    { text: lines, summary: lines, reasons: reasons.join('; ') },
    { headers: noStore }
  );
}
