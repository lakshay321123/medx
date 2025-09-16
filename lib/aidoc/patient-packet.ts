import { supabaseAdmin } from "@/lib/supabase/admin";
import { deriveInputs } from "@/lib/predict/derive";

type BuildArgs = { patientId: string; userId: string };

const PROFILE_FIELDS =
  "id, full_name, dob, sex, blood_group, chronic_conditions, conditions_predisposition";

/**
 * Normalize a value to an array.
 *
 * If `value` is already an array it is returned unchanged. If `value` is a string,
 * it will be parsed as JSON and the parsed value returned if it's an array.
 * Any other input, invalid JSON, or a parsed non-array yields an empty array.
 *
 * @param value - Input that may be an array or a JSON-encoded array string
 * @returns An array extracted from `value`, or an empty array when conversion is not possible
 */
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

/**
 * Loads a profile by `patientId`, falling back to `userId` if the first query fails; normalizes condition fields and returns the profile or `null`.
 *
 * If a profile is retrieved, `conditions_predisposition` and `chronic_conditions` are converted to arrays using `toArray`.
 *
 * @param patientId - Primary identifier used to query the profiles table.
 * @param userId - Fallback identifier used if querying by `patientId` fails.
 * @returns The profile object with normalized fields, or `null` if no profile could be retrieved.
 */
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

/**
 * Fetches up to 500 observations for the given user, ordered by observed_at descending.
 *
 * Returns an array of observation records (each includes id, kind, value_num, value_text, unit,
 * observed_at, created_at, meta, and details). On any error or if no data is found, returns an empty array.
 *
 * @param userId - The user identifier whose observations should be retrieved
 * @returns An array of observation objects, or an empty array on error
 */
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

/**
 * Fetches up to 50 prediction records for a patient, preferring lookup by patient ID and falling back to user ID.
 *
 * Attempts to select all columns from the "predictions" table ordered by `created_at` descending with a limit of 50.
 * First queries rows where `patient_id` equals `patientId`; if that query fails, it falls back to querying by `user_id` equals `userId`.
 * On any failure or if no rows are returned, the function returns an empty array.
 *
 * @param patientId - Primary identifier used to fetch predictions.
 * @param userId - Fallback identifier used if the patientId query fails.
 * @returns An array of prediction records (empty array on error or if no results).
 */
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

/**
 * Assemble a consolidated patient packet containing profile, observations, predictions, and derived risk inputs.
 *
 * Loads profile (preferring `patientId` with `userId` as a fallback), up to 500 observations for `userId`, and recent predictions (by `patientId` with `userId` fallback) in parallel. Attempts to derive risk inputs; if derivation fails, `derived.riskInputs` will be `null`. The returned packet also includes an ISO timestamp in `generatedAt`.
 *
 * @param patientId - Primary patient identifier used to load profile and predictions
 * @param userId - User identifier used to load observations and as a fallback for profile/predictions
 * @returns An object with shape { patientId, userId, profile, observations, predictions, derived: { riskInputs|null }, generatedAt } where `profile` may be `null` and lists default to empty arrays on fetch failure.
 */
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

