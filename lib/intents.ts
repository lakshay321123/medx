export type FollowupIntent = "medicines" | "hospitals" | "trials" | null;

export function detectFollowupIntent(text: string): FollowupIntent {
  const q = text.toLowerCase();
  if (/\b(medicine|medicines|drugs|treatment|best meds|best medicine)\b/.test(q)) return "medicines";
  if (/\b(hospital|hospitals|top hospitals|centre|center|clinic)\b/.test(q)) return "hospitals";
  if (/\b(latest|newest).*(trial|trials|study|studies|research)|\bclinical trial(s)?\b/.test(q)) return "trials";
  return null;
}

export function isTrialsIntent(q: string) {
  const s = q.toLowerCase();
  return /\b(trial|trials|nct\d{8}|clinicaltrials|phase\s*[1-4])\b/.test(s)
    || /\b(latest (studies|research|technolog(y|ies)|treatments?))\b/.test(s);
}
