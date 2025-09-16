import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Opts = { userId: string };

export async function assembleBundle({ userId }: Opts) {
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
      .limit(800),
  ]);

  return {
    profile: profile.data || null,
    observations: observations.data || [],
    labs: labs.data || [],
    meds: meds.data || [],
    chunks: (chunks.data || []).slice(0, 600),
  };
}
