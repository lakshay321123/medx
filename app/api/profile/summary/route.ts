export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function sanitizeMeds(list: any[]): string[] {
  const dose = /\b\d+\s*(?:mg|mcg|g|ml|iu|units?)\b/i;
  const form = /\b(tablet|tab|capsule|cap|syrup|patch|drop|injection|inj|cream|spray)\b/i;
  const stop = /^(patient|name|age|sex|history|physical|examination|diagnosis|impression)$/i;
  const out = new Set<string>();
  for (const item of list) {
    const t = String(item || '').replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (stop.test(t.toLowerCase())) continue;
    if (!dose.test(t) && !form.test(t)) continue;
    out.add(t);
  }
  return Array.from(out);
}

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
  const [pRes, oRes, prRes] = await Promise.all([
    db
      .from("profiles")
      .select("full_name,dob,sex,blood_group,chronic_conditions")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("observations")
      .select("*")
      .eq("user_id", userId)
      .eq('meta->>committed','true'),
    db
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const prof: any = pRes.data || {};
  const obs: any[] = oRes.data || [];
  const pred = prRes.data?.[0];

  const age = prof.dob
    ? Math.floor((Date.now() - new Date(prof.dob).getTime()) / (365.25 * 864e5))
    : null;
  const patientLine = `Patient: ${prof.full_name || '—'} (${prof.sex || 'Unknown'}${
    age ? `, ${age} y` : ''
  }${prof.blood_group ? `, ${prof.blood_group}` : ''})`;

  const chronicLine = `Chronic Conditions: ${
    Array.isArray(prof.chronic_conditions) && prof.chronic_conditions.length
      ? prof.chronic_conditions.join(', ')
      : '—'
  }`;

  const medsRaw = obs.flatMap((r: any) => {
    const m = r.meta || r.details || {};
    const list = m.meds || m.medicines || m.medications || [];
    return Array.isArray(list) ? list : typeof list === 'string' ? [list] : [];
  });
  const medsClean = sanitizeMeds(medsRaw);
  const medsLine = `Active Meds: ${
    medsClean.length
      ? medsClean.slice(0, 4).join('; ') +
        (medsClean.length > 4 ? `, +${medsClean.length - 4} more` : '')
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
    const d = pred.details ?? pred.meta ?? {};
    const label = pred.name || d.label || d.name || 'Prediction';
    const prob =
      typeof pred.probability === 'number'
        ? pred.probability
        : typeof d.probability === 'number'
        ? d.probability
        : null;
    const pct = prob != null ? Math.round(prob * 100) : null;
    const bucket = pct == null ? '—' : pct < 20 ? 'Low' : pct <= 60 ? 'Moderate' : 'High';
    predLine = `AI Prediction: ${label}: ${bucket}${pct != null ? ` (${pct}%)` : ''}`;
    reasons.push(`Prediction signal: ${label}`);
  }

  const notes = obs
    .filter((r) => /(note|symptom)/i.test(r.kind || r.name || ''))
    .sort((a, b) => when(b) - when(a))
    .slice(0, 2)
    .map((r) => (r.value_text || r.meta?.summary || r.meta?.text || '').toString().trim())
    .filter(Boolean);
  const notesLine = `Symptoms/Notes: ${notes.length ? notes.join('; ') : '—'}`;

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
    medsLine,
    labsLine,
    predLine,
    notesLine,
    'Next Steps: —',
    uploadsLine,
  ].join('\n');

  return NextResponse.json(
    { text: lines, summary: lines, reasons: reasons.join('; ') },
    { headers: noStore }
  );
}
