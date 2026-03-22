import { supabaseAdmin } from "@/lib/supabase/admin";

type MemScope = "aidoc.pref" | "aidoc.fact" | "aidoc.redflag" | "aidoc.goal";

export async function getMemory(userId: string): Promise<{
  prefs: { key: string; value: any }[];
  facts: { key: string; value: any }[];
  redflags: { key: string; value: any }[];
  goals: { key: string; value: any }[];
}> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("medx_memory")
    .select("scope, key, value")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  const pick = (scope: MemScope) => (data || []).filter((r: any) => r.scope === scope).map((r: any) => ({ key: r.key, value: r.value }));
  return { prefs: pick("aidoc.pref"), facts: pick("aidoc.fact"), redflags: pick("aidoc.redflag"), goals: pick("aidoc.goal") };
}

export async function saveMemory(userId: string, scope: MemScope, key: string, value: any) {
  const sb = supabaseAdmin();
  await sb.from("medx_memory").upsert(
    { user_id: userId, scope, key, value: typeof value === "string" ? { text: value } : value, source: "chat", updated_at: new Date().toISOString() },
    { onConflict: "user_id,scope,key" }
  );
}

export function formatMemoryForPrompt(mem: Awaited<ReturnType<typeof getMemory>>): string {
  const lines: string[] = [];
  if (mem.facts.length) lines.push(`Known facts: ${mem.facts.map(f => `${f.key}: ${typeof f.value === "object" ? f.value.text || JSON.stringify(f.value) : f.value}`).join("; ")}`);
  if (mem.prefs.length) lines.push(`Preferences: ${mem.prefs.map(p => `${p.key}: ${typeof p.value === "object" ? p.value.text || JSON.stringify(p.value) : p.value}`).join("; ")}`);
  if (mem.redflags.length) lines.push(`⚠️ Red flags: ${mem.redflags.map(r => `${r.key}: ${typeof r.value === "object" ? r.value.text || JSON.stringify(r.value) : r.value}`).join("; ")}`);
  if (mem.goals.length) lines.push(`Goals: ${mem.goals.map(g => `${g.key}: ${typeof g.value === "object" ? g.value.text || JSON.stringify(g.value) : g.value}`).join("; ")}`);
  return lines.length ? `[PATIENT MEMORY]\n${lines.join("\n")}` : "";
}
