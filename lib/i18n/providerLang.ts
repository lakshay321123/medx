const LANGUAGE_MAP: Record<string, string> = {
  hi: "hi",
  es: "es",
  it: "it",
  ar: "ar",
  zh: "zh-CN",
};

export function providerLang(appLang: string | null | undefined): string {
  if (!appLang) return "en";
  const normalized = appLang.trim().toLowerCase();
  if (!normalized) return "en";
  if (LANGUAGE_MAP[normalized]) return LANGUAGE_MAP[normalized];
  const base = normalized.split("-")[0];
  if (base && LANGUAGE_MAP[base]) return LANGUAGE_MAP[base];
  return "en";
}
