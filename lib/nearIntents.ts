export type NearCategory =
  | "pharmacy"
  | "hospital"
  | "lab"
  | "doctor"
  | "gynecologist"
  | "chiropractor"
  | "cardiovascular"
  | "pediatrician"
  | "dermatologist"
  | "neurologist";

export function detectNearIntent(text: string): NearCategory | null {
  const q = text.toLowerCase().trim();
  if (!/\bnear me\b/.test(q)) return null;
  if (/\b(pharma|pharmacy|chemist|drug ?store)\b/.test(q)) return "pharmacy";
  if (/\b(hospital|emergency|er)\b/.test(q)) return "hospital";
  if (/\b(lab|laboratory|blood test|pathology|diagnostic)\b/.test(q)) return "lab";
  if (/\b(gyn|gyno|gyne|gynecologist|gynaecologist|ob[-\s]?gyn|obgyn)\b/.test(q)) return "gynecologist";
  if (/\b(chiro|chiropractor|chiropractic)\b/.test(q)) return "chiropractor";
  if (/\b(cardio|cardiologist|heart|vascular)\b/.test(q)) return "cardiovascular";
  if (/\b(pediatric|paediatric|pediatri|child|kids?)\b/.test(q)) return "pediatrician";
  if (/\b(derma|dermatologist|skin)\b/.test(q)) return "dermatologist";
  if (/\b(neuro|neurologist|brain|nerve)\b/.test(q)) return "neurologist";
  if (/\b(doctor|gp|clinic|physician)\b/.test(q)) return "doctor";
  return "doctor";
}

