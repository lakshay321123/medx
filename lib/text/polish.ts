/**
 * Lightweight post-processor to keep output clean and professional.
 * - Collapses extra spaces
 * - Normalizes bullet spacing
 * - Replaces sequences of three ASCII dots with an ellipsis character
 * - Ensures sentences end with proper punctuation where obvious
 */
export function polishText(input: string): string {
  let s = input;

  // Collapse three or more dots into a single ellipsis character
  s = s.replace(/\.{3,}/g, "…");

  // Collapse multiple spaces
  s = s.replace(/[ \t]{2,}/g, " ");

  // Normalize line endings
  s = s.replace(/\r\n/g, "\n");

  // Ensure bullet spacing ("-text" -> "- text")
  s = s.replace(/(^|\n)-([^\s-])/g, "$1- $2");
  s = s.replace(/(^|\n)\*([^\s*])/g, "$1* $2");

  // Trim trailing spaces per line
  s = s.split("\n").map(line => line.replace(/[ \t]+$/g, "")).join("\n");

  // Ensure final line ends cleanly
  s = s.trimEnd();

  return s;
}

type AckTone = "warm" | "neutral";

export type TopicHint = {
  topic?: string;          // e.g., "butter chicken recipe", "leukemia trials"
  nextActions?: string[];  // brief CTA suggestions
};

export function politeAck(hint: TopicHint, tone: AckTone = "warm") {
  const topic = hint.topic ? ` on **${hint.topic}**` : "";
  const actions = hint.nextActions?.length
    ? ` Want me to ${hint.nextActions.map((a, i) => (i === 0 ? a : a)).join(" or ")}?`
    : "";

  const base =
    tone === "warm"
      ? "Glad that helps! "
      : "Noted. ";

  return `${base}Appreciate the feedback${topic}.${actions}`;
}

/**
 * Short helper to generate crisp suggestions by context.
 */
export function suggestNextByContext(topic?: string) {
  if (!topic) return ["continue", "save this"];
  const n = topic.toLowerCase();
  if (n.includes("recipe")) return ["lock this recipe", "add variations", "generate a shopping list"];
  if (n.includes("trial") || n.includes("trials")) return ["refine filters", "save these results", "set an alert"];
  if (n.includes("diet") || n.includes("workout")) return ["save this plan", "tune macros", "make a grocery list"];
  return ["continue", "save this"];
}
