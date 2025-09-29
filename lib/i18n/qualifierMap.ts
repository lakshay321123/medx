export const QUALIFIERS: Record<string, Record<string, string>> = {
  it: {
    Clinic: "Clinica",
    Physician: "Medico",
    "General Physician": "Medico di base",
    Center: "Centro",
  },
  zh: {
    Clinic: "诊所",
    Physician: "内科医生",
    "General Physician": "全科医生",
    Center: "中心",
  },
  ar: {
    Clinic: "عيادة",
    Physician: "طبيب",
    "General Physician": "طبيب عام",
    Center: "مركز",
  },
  es: {
    Clinic: "Clínica",
    Physician: "Médico",
    "General Physician": "Médico general",
    Center: "Centro",
  },
};

const TOKEN_PATTERN = /\b(General Physician|Physician|Clinic|Center)\b/g;

export function localizeQualifiers(name: string, lang: string): string {
  if (!name) return name;
  const normalized = (lang || "").toLowerCase();
  if (!normalized || normalized.startsWith("en")) return name;
  const candidate = normalized.split("-")[0] || normalized;
  const map = QUALIFIERS[normalized] || QUALIFIERS[candidate];
  if (!map) return name;
  return name.replace(TOKEN_PATTERN, match => map[match] ?? match);
}
