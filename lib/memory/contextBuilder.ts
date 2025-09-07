import type { BuildContextOptions } from "@/types/memory";
import { prisma } from "@/lib/prisma";
import { loadState } from "@/lib/context/stateStore";

export async function buildPromptContext(opts: {
  threadId: string;
  options: BuildContextOptions;
}) {
  const { threadId, options } = opts;
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      memories: true,
    },
  });
  if (!thread) throw new Error("Thread not found");

  const maxRecent = options.maxRecent ?? 10;
  const recent = thread.messages.slice(-maxRecent);

  const profile = thread.memories
    .filter(m => m.scope === "profile")
    .map(m => `- ${m.key}: ${m.value}`)
    .join("\n");

  const convState = await loadState(threadId);

  const persona =
    options.mode === "doctor"
      ? "You are MedX Doctor mode. Be precise, structured, and cite medical reasoning. Avoid tables unless explicitly requested or research mode is on."
      : "You are MedX Patient mode. Be clear, kind, and simple. No medical jargon unless asked.";

  const researchLine = options.researchOn
    ? "Research mode is ON: show trials table if trials are present; otherwise keep text concise."
    : "Research mode is OFF: do not render filters/table; give text only.";

  const system = [
    persona,
    researchLine,
    "Profile memory (never re-ask unless updated):",
    profile || "(none)",
    "Conversation summary:",
    thread.runningSummary || "(none)",
    "Conversation state (authoritative, JSON):",
    JSON.stringify(convState, null, 2),
    "Rules:",
    "- Continue within the active topic unless user changes it.",
    "- Do not drop previously established facts/preferences/decisions.",
    "- If current request conflicts with stored facts, confirm the update briefly and then proceed.",
    "- If unsure which topic the user means, ask a short clarify question with 2–3 options.",
  ].join("\n\n");

  return { system, recent };
}
