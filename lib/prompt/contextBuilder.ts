import { createClient } from "@/lib/supabase/server";

export async function buildContextBundle(thread_id?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: globalMem } = await supabase
    .from("medx_memory").select("key,value")
    .eq("user_id", user.id).eq("scope","global").limit(8);

  let threadMem: any[] = [];
  if (thread_id) {
    const { data } = await supabase
      .from("medx_memory").select("key,value")
      .eq("user_id", user.id).eq("scope","thread").eq("thread_id", thread_id).limit(8);
    threadMem = data ?? [];
  }

  return { memories: [...(globalMem ?? []), ...threadMem] };
}
