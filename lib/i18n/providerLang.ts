const LANGUAGE_MAP: Record<string, string> = {
  hi: "hi",
  es: "es",
  it: "it",
  ar: "ar",
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  "zh-tw": "zh-TW",
};

export function providerLang(appLang: string | null | undefined): string {
  if (!appLang) return "en";
  const trimmed = appLang.trim();
  if (!trimmed) return "en";

  const lower = trimmed.toLowerCase();
  if (LANGUAGE_MAP[lower]) {
    return LANGUAGE_MAP[lower];
  }

  const base = lower.split("-")[0];
  if (base && LANGUAGE_MAP[base]) {
    return LANGUAGE_MAP[base];
  }

  return "en";
}
