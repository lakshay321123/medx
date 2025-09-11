export type FollowupIntent = "medicines" | "hospitals" | "trials" | "vaccines" | null;

export function detectFollowupIntent(text: string): FollowupIntent {
  const q = text.toLowerCase();
  if (/\b(medicine|medicines|drugs|treatment|best meds|best medicine)\b/.test(q)) return "medicines";
  if (/\b(hospital|hospitals|top hospitals|centre|center|clinic)\b/.test(q)) return "hospitals";
  if (/\b(vaccine|vaccination|immunization|immunisation|shot|jab|flu shot|booster)\b/.test(q)) return "vaccines";
  if (/\b(latest|newest).*(trial|trials|study|studies|research)|\bclinical trial(s)?\b/.test(q)) return "trials";
  return null;
}
