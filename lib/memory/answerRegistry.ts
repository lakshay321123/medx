export type AnswerTag = "general" | "math" | "history";

export function indexAnswer(text: string) {
  const tags: AnswerTag[] = [];
  const lower = text.toLowerCase();
  if (/\=|∫|∂|√|\btheorem|lemma|proof\b/i.test(lower)) tags.push("math");
  if (/\bempire|dynasty|treaty|revolution|war|reign|century\b/i.test(lower)) tags.push("history");
  if (!tags.length) tags.push("general");
  return tags;
}
