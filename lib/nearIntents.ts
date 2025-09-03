export type NearType = "pharmacy" | "hospital" | null;

export function detectNearIntent(text: string): NearType {
  const q = text.toLowerCase();
  if (/\b(pharma|pharmacy|chemist|drug ?store)\b.*\bnear me\b|\bnear me\b.*\b(pharma|pharmacy|chemist|drug ?store)\b/.test(q))
    return "pharmacy";
  if (/\b(hospital|hospitals|clinic|er|emergency)\b.*\bnear me\b|\bnear me\b.*\b(hospital|hospitals|clinic|er|emergency)\b/.test(q))
    return "hospital";
  return null;
}
