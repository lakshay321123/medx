export function providerLang(appLang: string): string {
  switch (appLang) {
    case "hi":
      return "hi";
    case "es":
      return "es";
    case "it":
      return "it";
    case "ar":
      return "ar";
    case "zh":
    case "zh-CN":
      return "zh-CN";
    case "zh-TW":
      return "zh-TW";
    default:
      return "en";
  }
}
