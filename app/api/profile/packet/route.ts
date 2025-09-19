import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const noStore = { "cache-control": "no-store, max-age=0" };

export async function GET() {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ text: "" }, { headers: noStore });

  const db = supabaseAdmin();
  const [p, obs] = await Promise.all([
    db.from("profiles")
      .select("full_name,sex,blood_group,chronic_conditions,conditions_predisposition")
      .eq("id", uid)
      .maybeSingle(),
    db.from("observations")
      .select("kind,value_num,unit,observed_at")
      .eq("user_id", uid),
  ]);

  const prof: any = p.data || {};
  const rows: any[] = obs.data || [];

  const dayKey = (iso?: string) => {
    const d = iso ? new Date(iso) : null;
    return d && !isNaN(+d)
      ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10)
      : null;
  };

  const days = new Set<string>();
  for (const r of rows) { const k = dayKey(r.observed_at); if (k) days.add(k); }
  const totalDocs = days.size;

  const latestBy = (k: string) =>
    rows
      .filter(r => String(r.kind).toLowerCase() === k)
      .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())[0];

  const fmt = (r: any, label: string) =>
    r ? `${label}: ${r.value_num}${r.unit ? " " + r.unit : ""} (${new Date(r.observed_at).toLocaleDateString()})` : null;

  const highlights = [
    fmt(latestBy("hba1c"), "HbA1c"),
    fmt(latestBy("ldl_cholesterol"), "LDL"),
    fmt(latestBy("vitamin_d"), "Vitamin D"),
    fmt(latestBy("crp"), "CRP"),
    fmt(latestBy("egfr"), "eGFR"),
  ].filter(Boolean).join("\n");

  const text = [
    prof.full_name ? `Patient: ${prof.full_name}` : null,
    [prof.sex, prof.blood_group].filter(Boolean).join(" · ") || null,
    Array.isArray(prof.chronic_conditions) && prof.chronic_conditions.length ? `Chronic: ${prof.chronic_conditions.join(", ")}` : null,
    Array.isArray(prof.conditions_predisposition) && prof.conditions_predisposition.length ? `Predispositions: ${prof.conditions_predisposition.join(", ")}` : null,
    highlights ? `Labs:\n${highlights}` : null,
    `Total documents: ${totalDocs}`,
  ].filter(Boolean).join("\n");

  return NextResponse.json({ text }, { headers: noStore });
}
