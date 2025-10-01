export function providerLang(appLang?: string): string {
  const raw = (appLang ?? "en").toLowerCase().replace(/_/g, "-").trim();
  const [base, regionOrScript] = raw.split("-");

  switch (base) {
    case "hi":
    case "es":
    case "it":
    case "ar":
    case "fr":
      return base;

    case "zh": {
      const region = (regionOrScript ?? "").toLowerCase();
      if (region === "tw" || region === "hk" || region === "mo" || raw.includes("hant")) {
        return "zh-TW";
      }
      return "zh-CN";
    }

    default:
      return "en";
  }
}
