export type Intent =
  | 'boot'
  | 'small_greet'
  | 'summary_request'
  | 'symptom'
  | 'medication_request'
  | 'research'
  | 'danger'
  | 'general';

export function classifyIntent(text: string): Intent {
  const t = (text || "").toLowerCase().trim();
  if (t === '') return 'boot';
  if (/^(hi|hello|hey|yo|what'?s up|sup|gm|gn)\b/.test(t)) return 'small_greet';
  if (/\b(show|see|give|view)\b.*\b(summary|recap|overview)\b/.test(t))
    return 'summary_request';
  if (/\b(latest|new|recent)\b.*\b(treatment|trial|therapy|guideline|research)\b/.test(t))
    return 'research';
  if (/\bdo i have\b.*(cancer|tb|covid|malaria|pneumonia)/.test(t)) return 'danger';
  if (/\bwhat\s+(medicine|tablet|pill|drug)\b|\bshould i take\b/.test(t))
    return 'medication_request';
  if (/\b(back pain|low back|lumbar|fever|headache|migraine|cough|cold|sore throat|throat pain|vomit|diarrhea|rash|chest pain)\b/.test(t))
    return 'symptom';
  return 'general';
}
