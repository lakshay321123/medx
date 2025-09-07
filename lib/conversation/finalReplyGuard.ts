export function finalReplyGuard(userMsg: string, candidate: string): string {
  const m = userMsg.trim().toLowerCase();
  if (["thanks", "thank you", "nice", "great", "exactly", "ok", "okay", "sure", "done"].includes(m)) {
    // Force a short reply: ≤ 14 words, no lists/headings
    const short = candidate.replace(/[#*-].+$/gm, "").split(/\n/)[0];
    if (short.split(/\s+/).length <= 14) return short;
    return "Anytime! Want me to tweak anything?";
  }
  return candidate;
}
