export const SUPPORTED_LANGS = ["en", "es", "it", "hi", "ar", "zh", "fr"] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export function normalizeLanguageTag(input?: string): SupportedLang {
  const raw = String(input ?? "")
    .replace(/_/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "")
    .trim();
  if (!raw) return "en";

  try {
    const [canonical] = Intl.getCanonicalLocales(raw);
    const base = (canonical || raw || "en").toLowerCase();
    if (base.startsWith("fr")) return "fr";
    if (base.startsWith("es")) return "es";
    if (base.startsWith("it")) return "it";
    if (base.startsWith("hi")) return "hi";
    if (base.startsWith("ar")) return "ar";
    if (base.startsWith("zh")) return "zh";
    return SUPPORTED_LANGS.includes(base as SupportedLang) ? (base as SupportedLang) : "en";
  } catch {
    return "en";
  }
}
