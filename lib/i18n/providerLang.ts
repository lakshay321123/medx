export function providerLang(appLang: string): string {
  const normalized = (appLang || "").trim();
  if (!normalized) {
    return "en";
  }

  switch (normalized) {
    case "hi":
    case "es":
    case "it":
    case "ar":
      return normalized;
    case "zh":
    case "zh-CN":
      return "zh-CN";
    case "zh-cn":
      return "zh-CN";
    case "zh-TW":
    case "zh-tw":
      return "zh-TW";
    default:
      break;
  }

  const base = normalized.split("-")[0];
  switch (base) {
    case "hi":
    case "es":
    case "it":
    case "ar":
      return base;
    case "zh":
      return "zh-CN";
    default:
      return "en";
  }
}
