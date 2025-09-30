export function languageInstruction(lang?: string): string {
  const trimmed = (lang || "en").trim();
  let normalized = trimmed;
  try {
    const [canon] = Intl.getCanonicalLocales(trimmed);
    if (canon) {
      normalized = canon;
    }
  } catch {
    normalized = trimmed || "en";
  }
  const lower = normalized.toLowerCase();
  const base = lower.split("-")[0] || lower;
  let display = base;
  try {
    const displayNames = new Intl.DisplayNames([lower], { type: "language" });
    display = displayNames.of(base) || base;
  } catch {
    display = base;
  }
  return [
    `IMPORTANT: Answer ONLY in ${display} (${normalized}).`,
    `Do not switch languages even if the user writes in another language.`,
    `Do not translate quoted text or code; keep those verbatim.`,
  ].join(" ");
}
