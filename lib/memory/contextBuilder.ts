import { loadState } from "@/lib/context/stateStore";
import { loadTopicStack, titleOf } from "@/lib/context/topicStack";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt, resolveLocaleForLang, SYSTEM_DEFAULT_LANG } from "@/lib/prompt/system";
import { normalizeLanguageTag } from "@/lib/i18n/lang";
import { languageInstruction } from "@/lib/ai/prompts/common";

export async function buildPromptContext({
  threadId,
  options,
}: {
  threadId: string;
  options: { mode?: string; researchOn?: boolean; lang?: string };
}) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { runningSummary: true },
  });

  const convState = await loadState(threadId);
  const stack = await loadTopicStack(threadId);
  const activeTitle = titleOf(stack);

  const lang = normalizeLanguageTag(options?.lang || SYSTEM_DEFAULT_LANG);
  const locale = resolveLocaleForLang(lang);
  const baseSystem = buildSystemPrompt({ locale, lang, includeDirective: false });
  const langDirective = languageInstruction(lang);

  const system = [
    baseSystem,
    "Active topic:",
    activeTitle || "(none)",

    "Conversation summary:",
    thread?.runningSummary || "(none)",

    "Conversation state (JSON):",
    JSON.stringify(convState, null, 2),

    "Constraint ledger (must be respected):",
    JSON.stringify(convState?.constraints ?? {}, null, 2),

    "Mode flags:",
    JSON.stringify({ mode: options.mode, researchOn: options.researchOn }),
  ].join("\n\n");

  // Include last ~8 messages (or however you did before)
  const recent = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { role: true, content: true },
  });
  recent.reverse();

  return { system, recent, langDirective };
}
