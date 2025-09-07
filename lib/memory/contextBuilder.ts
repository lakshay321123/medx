import { loadState } from "@/lib/context/stateStore";
import { loadTopicStack, titleOf } from "@/lib/context/topicStack";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/prompt/system";

export async function buildPromptContext({
  threadId,
  options,
}: {
  threadId: string;
  options: { mode?: string; researchOn?: boolean };
}) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { runningSummary: true },
  });

  const convState = await loadState(threadId);
  const stack = await loadTopicStack(threadId);
  const activeTitle = titleOf(stack);

  const system = [
    buildSystemPrompt({ locale: "en-IN" }),
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

  return { system, recent };
}
