export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ summary: "", reasons: "" }, { headers: noStore });

  const supa = supabaseAdmin();
  const [prof, obs, preds] = await Promise.all([
    supa
      .from("profiles")
      .select("full_name, dob, sex, blood_group, conditions_predisposition, chronic_conditions")
      .eq("id", userId)
      .maybeSingle(),
    supa.from("observations").select("*").eq("user_id", userId),
    supa.from("predictions").select("*").eq("user_id", userId),
  ]);

  const p: any = prof.data || {};
  const observations = obs.data || [];
  const predictions = preds.data || [];

  const textOf = (r: any) =>
    `${(r.name || "").toLowerCase()} ${JSON.stringify(r.meta || {}).toLowerCase()} ${JSON.stringify(r.details || {}).toLowerCase()}`;
  const when = (r: any) =>
    new Date(
      r.observed_at ||
        r.meta?.report_date ||
        r.details?.report_date ||
        r.created_at ||
        0
    ).getTime();
  const pickLatest = (rx: RegExp) =>
    observations.filter((r: any) => rx.test(textOf(r))).sort((a: any, b: any) => when(b) - when(a))[0];
  const vStr = (r: any) =>
    `${r?.value ?? r?.meta?.value ?? r?.details?.value ?? "?"}${
      r?.unit ?? r?.meta?.unit ?? r?.details?.unit ? ` ${r?.unit ?? r?.meta?.unit ?? r?.details?.unit}` : ""
    }`;

  const analytes: { label: string; rx: RegExp }[] = [
    { label: "HbA1c", rx: /\bhba1c\b/i },
    { label: "Fasting glucose", rx: /(fpg|fasting (blood )?sugar|blood sugar fasting|fbs|fbg|glucose fasting)/i },
    { label: "TSH", rx: /\btsh\b/i },
    { label: "eGFR", rx: /\begfr\b/i },
    { label: "Creatinine", rx: /\bcreatinine\b/i },
    { label: "LDL", rx: /\bldl\b/i },
    { label: "HDL", rx: /\bhdl\b/i },
    { label: "Triglycerides", rx: /triglycer(i|y)des?/i },
    { label: "CRP", rx: /\b(c-?reactive protein|crp)\b/i },
    { label: "ESR", rx: /\b(erythrocyte sedimentation rate|esr)\b/i },
    { label: "Serum Cortisol", rx: /\bcortisol\b/i },
    { label: "Vitamin D (25-OH)", rx: /(vitamin d|25[-\s]?oh|25 hydroxy)/i },
  ];

  const lines: string[] = [];
  if (p.full_name) lines.push(`Patient: ${p.full_name}`);
  const idBits = [p.sex, p.blood_group ? `Blood group ${p.blood_group}` : null]
    .filter(Boolean)
    .join(" · ");
  if (idBits) lines.push(idBits);
  if (Array.isArray(p.chronic_conditions) && p.chronic_conditions.length)
    lines.push(`Chronic: ${p.chronic_conditions.join(", ")}`);
  if (Array.isArray(p.conditions_predisposition) && p.conditions_predisposition.length)
    lines.push(`Predispositions: ${p.conditions_predisposition.join(", ")}`);

  const reasons: string[] = [];
  for (const a of analytes) {
    const r = pickLatest(a.rx);
    if (r) {
      const s = `${a.label}: ${vStr(r)}`;
      lines.push(s);
      reasons.push(s);
    }
  }

  const topPred = predictions
    .map((r: any) => {
      const d = r.details ?? r.meta ?? {};
      const name = r.name ?? d.label ?? d.name ?? "Model prediction";
      const prob =
        typeof r.probability === "number"
          ? r.probability
          : typeof d?.fractured === "number"
          ? d.fractured
          : typeof d?.probability === "number"
          ? d.probability
          : null;
      return { name, prob };
    })
    .sort((a, b) => (b.prob ?? 0) - (a.prob ?? 0))[0];
  if (topPred?.name) {
    lines.push(
      `AI risk focus: ${topPred.name}${
        typeof topPred.prob === "number" ? ` (${Math.round(topPred.prob * 100)}%)` : ""
      }`
    );
    reasons.push(`Prediction signal: ${topPred.name}`);
  }

  return NextResponse.json({ summary: lines.join("\n"), reasons: reasons.join("; ") }, { headers: noStore });
}
