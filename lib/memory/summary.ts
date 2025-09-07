import { setRunningSummary } from "./store";

/**
 * Extremely small, deterministic summarizer:
 * - Maintain bullet lines for conversation context.
 * - Trim over maxChars, keeping the most recent content.
 */
export function updateSummary(prev: string, lastUser: string, lastAssistant?: string, maxChars = 1500) {
  const newLines = [
    prev?.trim() || "• Context started",
    `• User: ${lastUser}`,
    lastAssistant ? `• Assistant: ${lastAssistant}` : undefined,
  ].filter(Boolean) as string[];

  let out = newLines.join("\n");

  // Trim oldest if too long
  if (out.length > maxChars) {
    out = out.slice(out.length - maxChars);
    const idx = out.indexOf("•");
    if (idx > 0) out = out.slice(idx);
  }

  return out;
}

export async function persistUpdatedSummary(threadId: string, updated: string) {
  await setRunningSummary(threadId, updated);
}
