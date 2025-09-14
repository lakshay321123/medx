export type YN = "yes" | "no" | null;

const YES = [
  "y", "yes", "yup", "yep", "yeah", "ya", "sure",
  "ok", "okay", "k", "kk", "k.", "affirmative",
  "go ahead", "proceed", "do it", "let's do it",
  "start", "begin", "please do", "yo", "👍", "✅", "✔️"
];

const NO = [
  "n", "no", "nope", "nah", "negative",
  "stop", "cancel", "not now", "later", "hold on", "wait", "skip", "pass", "👎"
];

function norm(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();
}

export function detectYesNo(input: string): YN {
  const t = norm(input);
  if (!t) return null;

  // Short fast path:
  if (YES.includes(t)) return "yes";
  if (NO.includes(t)) return "no";

  // Phrase match:
  for (const y of YES) if (t.startsWith(y) || t.includes(` ${y} `)) return "yes";
  for (const n of NO)  if (t.startsWith(n) || t.includes(` ${n} `)) return "no";

  return null;
}
