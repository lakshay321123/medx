export type IntentContext = { mode?: 'patient'|'doctor'|'research'; condition?: string };
export type IntentResult = {
  mode: 'patient'|'doctor'|'research';
  research: boolean;
  audience: 'patient'|'doctor';
  condition: string;
  new_case: boolean;
};

const RESEARCH_RE = /(trial|trials|study|studies|research|meta-?analysis)/i;
const DOCTOR_RE = /\b(doctor|clinician|professional|ddx|differential)\b/i;
const PATIENT_RE = /\b(patient|simple|layman|explain simply)\b/i;
const TREATMENT_RE = /\b(treatment|management|therapy)\b/i;

export function routeIntent(text: string, prev: IntentContext = {}): IntentResult {
  const q = text.toLowerCase();
  const research = RESEARCH_RE.test(q);
  const mode = DOCTOR_RE.test(q) || (research && TREATMENT_RE.test(q))
    ? 'doctor'
    : PATIENT_RE.test(q)
    ? 'patient'
    : prev.mode || 'patient';
  const audience = mode === 'doctor' ? 'doctor' : 'patient';
  let condition = prev.condition || '';
  let new_case = false;
  const condMatch = q.match(/trials? (?:for|on)?\s*([a-z0-9\s]+)$/i) || q.match(/(?:for|about)\s+([a-z0-9\s]+)$/i);
  if (condMatch) {
    condition = condMatch[1].trim();
    new_case = condition.toLowerCase() !== (prev.condition || '').toLowerCase();
  }
  if (!condition) {
    condition = '';
  }
  return { mode: research ? (mode === 'patient' ? 'patient' : 'doctor') : mode, research, audience, condition, new_case };
}
