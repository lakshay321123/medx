export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

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

export async function GET() {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ text: "" }, { headers: noStore });
  const db = supabaseAdmin();
  const [p, obs] = await Promise.all([
    db
      .from("profiles")
      .select("full_name,sex,blood_group,chronic_conditions")
      .eq("id", uid)
      .maybeSingle(),
    db.from("observations").select("*").eq("user_id", uid),
  ]);
  const prof: any = p.data || {};
  const rows: any[] = obs.data || [];
  const by = (rx: RegExp) =>
    rows.filter((r) =>
      rx.test(
        `${r.name} ${JSON.stringify(r.meta || {})} ${JSON.stringify(r.details || {})}`.toLowerCase()
      )
    );
  const latest = (arr: any[]) =>
    arr.sort(
      (a, b) =>
        new Date(b.observed_at || b.created_at).getTime() -
        new Date(a.observed_at || a.created_at).getTime()
    )[0];

  const medsAll = (rows || [])
    .flatMap((r: any) => {
      const m = r.meta || r.details || {};
      const list = m.meds || m.medicines || m.medications || [];
      return Array.isArray(list) ? list : typeof list === "string" ? [list] : [];
    })
    .map((s: any) => String(s).replace(/\s+/g, " ").trim())
    .filter(looksLikeMed);
  const meds = Array.from(
    new Map(medsAll.map((m) => [m.toLowerCase().replace(/[^a-z0-9]+/g, ""), m])).values()
  ).slice(0, 15);
  const hb = latest(by(/\bhba1c\b/i));
  const fpg = latest(by(/(fasting (blood )?sugar|fpg|fbs|glucose fasting)/i));
  const egfr = latest(by(/\begfr\b/i));
  const crp = latest(by(/\b(c-?reactive protein|crp)\b/i));
  const vitd = latest(by(/(vitamin d|25[-\s]?oh)/i));

  const line = (lbl: string, r: any) =>
    r
      ? `${lbl}: ${r.value ?? r.meta?.value ?? r.details?.value ?? "?"}${
          r.unit ?? r.meta?.unit ?? r.details?.unit ? ` ${r.unit ?? r.meta?.unit ?? r.details?.unit}` : ""
        } (${new Date(r.observed_at || r.created_at).toLocaleDateString()})`
      : null;
  const highlights = [
    line("HbA1c", hb),
    line("Fasting glucose", fpg),
    line("eGFR", egfr),
    line("CRP", crp),
    line("Vitamin D", vitd),
  ]
    .filter(Boolean)
    .join("\n");

  const text = [
    prof.full_name ? `Patient: ${prof.full_name}` : null,
    [prof.sex, prof.blood_group ? `Blood group ${prof.blood_group}` : null]
      .filter(Boolean)
      .join(" · ") || null,
    Array.isArray(prof.chronic_conditions) && prof.chronic_conditions.length
      ? `Chronic: ${prof.chronic_conditions.join(", ")}`
      : null,
    meds.length ? `Active meds: ${meds.join("; ")}` : null,
    highlights ? `Labs:\n${highlights}` : null,
    `Total documents: ${rows.length}`,
  ]
    .filter(Boolean)
    .join("\n");
  return NextResponse.json({ text }, { headers: noStore });
}
