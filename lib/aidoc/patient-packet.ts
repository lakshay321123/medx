import { supabaseAdmin } from "@/lib/supabase/admin";
import { deriveInputs } from "@/lib/predict/derive";

type BuildArgs = { patientId: string; userId: string };

const PROFILE_FIELDS =
  "id, full_name, dob, sex, blood_group, chronic_conditions, conditions_predisposition";

function toArray(value: any) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function loadProfile(supabase: ReturnType<typeof supabaseAdmin>, patientId: string, userId: string) {
  const attempt = async (id: string) =>
    supabase.from("profiles").select(PROFILE_FIELDS).eq("id", id).maybeSingle();

  let res = await attempt(patientId);
  if (res.error) {
    res = await attempt(userId);
  }
  if (res.error) return null;
  const profile = res.data ?? null;
  if (profile) {
    (profile as any).conditions_predisposition = toArray((profile as any).conditions_predisposition);
    (profile as any).chronic_conditions = toArray((profile as any).chronic_conditions);
  }
  return profile;
}

async function loadObservations(supabase: ReturnType<typeof supabaseAdmin>, userId: string) {
  try {
    const res = await supabase
      .from("observations")
      .select("id, kind, value_num, value_text, unit, observed_at, created_at, meta, details")
      .eq("user_id", userId)
      .order("observed_at", { ascending: false })
      .limit(500);
    if (res.error) throw res.error;
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

async function loadPredictions(
  supabase: ReturnType<typeof supabaseAdmin>,
  patientId: string,
  userId: string,
) {
  const selectAll = () =>
    supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

  try {
    const byPatient = await selectAll().eq("patient_id", patientId);
    if (byPatient.error) throw byPatient.error;
    return Array.isArray(byPatient.data) ? byPatient.data : [];
  } catch {
    try {
      const byUser = await selectAll().eq("user_id", userId);
      if (byUser.error) throw byUser.error;
      return Array.isArray(byUser.data) ? byUser.data : [];
    } catch {
      return [];
    }
  }
}

export async function buildPatientPacket({ patientId, userId }: BuildArgs) {
  const supa = supabaseAdmin();

  const [profile, observations, predictions] = await Promise.all([
    loadProfile(supa, patientId, userId),
    loadObservations(supa, userId),
    loadPredictions(supa, patientId, userId),
  ]);

  let riskInputs: any = null;
  try {
    riskInputs = await deriveInputs(userId);
  } catch {
    riskInputs = null;
  }

  return {
    patientId,
    userId,
    profile,
    observations,
    predictions,
    derived: { riskInputs },
    generatedAt: new Date().toISOString(),
  };
}

