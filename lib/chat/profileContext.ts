import { supabaseAdmin } from "@/lib/supabase/admin";

export type ProfileContext = {
  text: string;
  conditions: string[];
  medications: string[];
  vitals: Record<string, number>;
  age: number | null;
  sex: string | null;
};

export async function buildProfileContext(userId: string): Promise<ProfileContext> {
  const sb = supabaseAdmin();

  // Parallel fetch: profile + vitals + medications
  const [profileRes, vitalsRes, medsRes] = await Promise.all([
    sb.from("profiles").select("full_name, dob, sex, blood_group, height_cm, weight_kg, bmi, chronic_conditions, conditions_predisposition").eq("id", userId).single(),
    sb.from("observations").select("kind, value_num, unit").eq("user_id", userId).in("kind", ["bp_systolic", "bp_diastolic", "heart_rate", "spo2", "bmi", "hemoglobin", "hba1c"]).order("observed_at", { ascending: false }).limit(20),
    sb.from("observations").select("value_text, meta").eq("user_id", userId).eq("kind", "medication").order("observed_at", { ascending: false }).limit(20),
  ]);

  const p = profileRes.data;
  const age = p?.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const conditions = [...(p?.chronic_conditions || []), ...(p?.conditions_predisposition || [])].filter(Boolean);
  
  // Extract latest vitals
  const vitals: Record<string, number> = {};
  for (const v of (vitalsRes.data || []) as any[]) {
    if (v.kind && v.value_num != null && !(v.kind in vitals)) vitals[v.kind] = Number(v.value_num);
  }

  // Extract medications
  const medications = [...new Set((medsRes.data || []).map((m: any) => m.value_text || m.meta?.normalizedName).filter(Boolean))].slice(0, 10) as string[];

  // Build human-readable context
  const lines: string[] = [];
  if (p?.full_name) lines.push(`Patient: ${p.full_name}${age ? `, ${age}y` : ""}${p?.sex ? ` ${p.sex}` : ""}${p?.blood_group ? `, ${p.blood_group}` : ""}`);
  if (vitals.bp_systolic && vitals.bp_diastolic) lines.push(`BP: ${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg`);
  if (vitals.heart_rate) lines.push(`HR: ${vitals.heart_rate} bpm`);
  if (vitals.bmi || p?.bmi) lines.push(`BMI: ${vitals.bmi || p?.bmi}`);
  if (vitals.hba1c) lines.push(`HbA1c: ${vitals.hba1c}%`);
  if (vitals.hemoglobin) lines.push(`Hb: ${vitals.hemoglobin} g/dL`);
  if (conditions.length) lines.push(`Conditions: ${conditions.join(", ")}`);
  if (medications.length) lines.push(`Medications: ${medications.join(", ")}`);

  return {
    text: lines.length ? `[PATIENT CONTEXT]\n${lines.join("\n")}` : "",
    conditions,
    medications,
    vitals,
    age,
    sex: p?.sex || null,
  };
}
