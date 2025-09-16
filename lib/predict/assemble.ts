import { createClient as createServerClient } from "@/lib/supabase/server";

type Opts = { userId: string };

export async function assembleBundle({ userId }: Opts) {
  const sb = createServerClient();
  const [profile, observations, labs, meds, chunks] = await Promise.all([
    sb.from("profile").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("observations").select("*").eq("user_id", userId).order("observed_at", { ascending: true }),
    sb.from("labs_values").select("*").eq("user_id", userId).order("observed_at", { ascending: true }),
    sb.from("medications").select("*").eq("user_id", userId).order("start_date", { ascending: true }),
    sb
      .from("text_chunks")
      .select("file_id,page,chunk_index,content,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(600),
  ]);

  for (const r of [profile, observations, labs, meds, chunks]) {
    if (r.error) {
      throw new Error(`Supabase fetch error: ${r.error.message}`);
    }
  }

  return {
    profile: profile.data || null,
    observations: observations.data || [],
    labs: labs.data || [],
    meds: meds.data || [],
    chunks: (chunks.data || []).slice(0, 600),
  };
}
