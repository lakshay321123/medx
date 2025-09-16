import type { SupabaseClient } from "@supabase/supabase-js";

type Nullable<T> = T | null | undefined;

type ProfileLike = {
  full_name?: Nullable<string>;
  dob?: Nullable<string>;
  sex?: Nullable<string>;
};

export type PatientRow = {
  id: string;
  user_id: string;
  name: string | null;
  dob: string | null;
  sex: string | null;
};

export async function ensurePrimaryPatient(
  supa: SupabaseClient,
  userId: string,
  profile?: ProfileLike
): Promise<PatientRow | null> {
  const existing = await supa
    .from("patients")
    .select("id,user_id,name,dob,sex")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data && existing.data.length > 0) {
    const row = existing.data[0];
    if (profile) {
      const patch: Record<string, any> = {};
      if (typeof profile.full_name === "string" && profile.full_name !== row.name)
        patch.name = profile.full_name;
      if (typeof profile.dob === "string" && profile.dob !== row.dob)
        patch.dob = profile.dob;
      if (typeof profile.sex === "string" && profile.sex !== row.sex)
        patch.sex = profile.sex;
      if (Object.keys(patch).length) {
        const updated = await supa
          .from("patients")
          .update(patch)
          .eq("id", row.id)
          .select("id,user_id,name,dob,sex")
          .maybeSingle();
        if (updated.error) throw new Error(updated.error.message);
        return updated.data as PatientRow;
      }
    }
    return existing.data[0] as PatientRow;
  }

  const insert = await supa
    .from("patients")
    .insert({
      user_id: userId,
      name: profile?.full_name ?? null,
      dob: profile?.dob ?? null,
      sex: profile?.sex ?? null,
    })
    .select("id,user_id,name,dob,sex")
    .maybeSingle();
  if (insert.error) throw new Error(insert.error.message);
  return insert.data as PatientRow;
}

export async function listPatientIds(
  supa: SupabaseClient,
  userId: string
): Promise<string[]> {
  const res = await supa
    .from("patients")
    .select("id")
    .eq("user_id", userId);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map(r => r.id as string);
}
