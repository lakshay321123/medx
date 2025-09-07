export type RouteDecision = "continue" | "switch-topic" | "clarify-quick";

export function decideRoute(userText: string, lastTopicTitle?: string): RouteDecision {
  const s = userText.toLowerCase();

  // Hard switch keywords
  const switchMarkers = ["new topic", "start over", "ignore above", "different question"];
  if (switchMarkers.some(m => s.includes(m))) return "switch-topic";

  // If the message is a short modifier like add X, without Y, use Z, continue
  if (/^(add|include|use|with|without|no|swap|replace|instead)/.test(s)) return "continue";

  // If it starts with what, how, why and contains a different domain noun than last topic, ask quick clarify
  const askWords = ["what", "how", "why", "where", "when"];
  if (askWords.some(w => s.startsWith(w)) && lastTopicTitle && !s.includes(lastTopicTitle.toLowerCase())) {
    return "clarify-quick";
  }

  return "continue";
}
