export type Intent =
  | 'greet'
  | 'symptom'
  | 'medication_request'
  | 'research'
  | 'general'
  | 'danger'
  | 'summary_request';

export function classifyIntent(text: string): Intent {
  const t = (text||"").toLowerCase().trim();
  if (!t) return 'greet';
  if (/\b(latest|new|recent)\b.*\b(treatment|trial|therapy|guideline|research)\b/.test(t))
    return 'research';
  if (/\bdo i have\b.*(cancer|tb|covid|malaria|pneumonia)/.test(t)) return 'danger';
  if (/\bwhat\s+(medicine|tablet|pill|drug)\b|\bshould i take\b/.test(t))
    return 'medication_request';
  if (/\b(fever|headache|migraine|cough|cold|sore throat|throat pain|vomit|diarrhea|pain|rash)\b/.test(t))
    return 'symptom';
  if (/^(hi|hello|hey|yo|good (morning|afternoon|evening)|what'?s up|sup)\b/.test(t))
    return 'greet';
  if (/\b(show|see|give|view)\b.*\b(summary|recap|overview)\b/.test(t))
    return 'summary_request';
  return 'general';
}
