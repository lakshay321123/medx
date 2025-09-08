export function detectRecallIntent(text: string): { query: string } | null {
  const t = text.toLowerCase();
  const recallMatch = t.match(/(?:pull up|show|recall|repeat|timeline|again)\s*(.*)/);
  if (recallMatch) {
    const q = recallMatch[1] || t;
    return { query: q.trim() };
  }
  return null;
}
