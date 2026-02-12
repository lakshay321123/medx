import { loadState } from "@/lib/context/stateStore";
import { loadTopicStack, titleOf } from "@/lib/context/topicStack";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/getUserId";
import { buildSystemPrompt, languageDirectiveFor, resolveLocaleForLang, SYSTEM_DEFAULT_LANG } from "@/lib/prompt/system";

export async function buildPromptContext({
  threadId,
  options,
}: {
  threadId: string;
  options: { mode?: string; researchOn?: boolean; lang?: string; includeHistory?: boolean };
}) {
  const userId = await getUserId();
  const sb = db();

  const { data: summaryRow } = userId
    ? await sb
        .from("medx_memory")
        .select("value")
        .eq("user_id", userId)
        .eq("scope", "thread")
        .eq("thread_id", threadId)
        .eq("key", "running_summary")
        .maybeSingle()
    : { data: null as any };

  const convState = await loadState(threadId);
  const stack = await loadTopicStack(threadId);
  const activeTitle = titleOf(stack);

  const lang = (options?.lang || SYSTEM_DEFAULT_LANG).toLowerCase();
  const locale = resolveLocaleForLang(lang);
  const baseSystem = buildSystemPrompt({ locale, lang, includeDirective: false });
  const langDirective = languageDirectiveFor(lang);
  const includeHistory = options?.includeHistory !== false;
  const parts: string[] = [];
  parts.push(baseSystem, "Active topic:", activeTitle || "(none)");

  if (includeHistory) {
    parts.push(
      "Conversation summary:",
      (summaryRow?.value as any)?.v || "(none)",
      "Conversation state (JSON):",
      JSON.stringify(convState, null, 2),
      "Constraint ledger (must be respected):",
      JSON.stringify(convState?.constraints ?? {}, null, 2),
      "Mode flags:",
      JSON.stringify({ mode: options.mode, researchOn: options.researchOn }),
    );
  } else {
    parts.push("Mode flags:", JSON.stringify({ mode: options.mode, researchOn: options.researchOn }));
  }

  const system = parts.join("\n\n");

  let recent: { role: string; content: string }[] = [];
  if (includeHistory && userId) {
    const { data } = await sb
      .from("chat_messages")
      .select("role,content,created_at")
      .eq("user_id", userId)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(8);
    recent = (data ?? [])
      .reverse()
      .map((r: any) => ({ role: r.role, content: typeof r.content === "string" ? r.content : (r.content?.text ?? "") }));
  }

  return { system, recent, langDirective };
}
