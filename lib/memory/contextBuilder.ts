import type { BuildContextOptions } from "@/types/memory";
import { prisma } from "@/lib/prisma";

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

  const persona = options.mode === "doctor"
    ? "You are MedX Doctor mode. Be precise, structured, and cite medical reasoning. Avoid tables unless explicitly requested or research mode is on."
    : "You are MedX Patient mode. Be clear, kind, and simple. No medical jargon unless asked.";

  const researchLine = options.researchOn
    ? "Research mode is ON: show trials table if trials are present; otherwise keep text concise."
    : "Research mode is OFF: do not render filters/table; give text only.";

  const system = [
    persona,
    researchLine,
    "Never re-ask details already present in profile unless user says they changed.",
    "If user asks to ‘remember’ something long-term, store it under profile memory.",
    `Compact context summary:\n${thread.runningSummary || "(none)"}`,
    profile ? `Known profile:\n${profile}` : "Known profile: (empty)",
  ].join("\n\n");

  return { system, recent };
}
