import { setRunningSummary } from "./store";

/**
 * Extremely small, deterministic summarizer:
 * - Keep bullet points of key user facts and current task/topic.
 * - Trim over 1500 chars.
 * Replace with LLM summarizer later if desired.
 */
export function updateSummary(prev: string, lastUser: string, lastAssistant?: string, maxChars = 1500) {
  const lines = [
    prev?.trim() ? prev.trim() : "• Context: (initial)\n",
    `• User said: ${lastUser}`,
    lastAssistant ? `• We replied: ${lastAssistant}` : undefined,
  ].filter(Boolean) as string[];

  let out = lines.join("\n");
  if (out.length > maxChars) {
    // trim oldest part
    out = out.slice(out.length - maxChars);
    // ensure starts cleanly
    const idx = out.indexOf("•");
    if (idx > 0) out = out.slice(idx);
  }
  return out;
}

export async function persistUpdatedSummary(threadId: string, updated: string) {
  await setRunningSummary(threadId, updated);
}
