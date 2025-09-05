export type SymptomKey =
  | 'fever'
  | 'headache'
  | 'cough'
  | 'sore_throat'
  | 'cold'
  | 'back_pain';

export const SUGGESTED_TESTS: Record<SymptomKey, string[]> = {
  back_pain: [
    "Consider physio evaluation",
    "If pain persists >2–6 weeks or neuro signs → MRI lumbar spine",
    "If fever/trauma/red flags → urgent clinician review",
  ],
  fever: ["CBC", "malaria rapid/ smear (context)", "urinalysis (if urinary symptoms)", "COVID/flu (if exposure)"],
  headache: ["BP check", "CBC (if systemic symptoms)", "consider eye exam (if strain)", "neurology consult if red flags"],
  cough: ["CBC", "chest X-ray (if persistent >3 weeks)", "COVID/flu (if exposure)", "spirometry (if wheeze/asthma hx)"],
  sore_throat: ["Rapid strep/ throat swab (as applicable)", "CBC if prolonged", "CRP (if clinician requests)"],
  cold: ["Usually supportive care; tests rarely needed unless persistent/worsening"],
};

export const SELF_CARE_EDU: Record<SymptomKey, string> = {
  back_pain:
    "Relative rest 24–48h, heat/ice as preferred, gentle mobility & core stretches; avoid heavy lifting. People sometimes consider paracetamol as per label if appropriate and no allergies.",
  fever: "Hydration, rest, temperature monitoring; people often consider paracetamol as per label dosing if no allergies.",
  headache: "Hydration, sleep, reduce screen strain; people sometimes consider paracetamol per label if no contraindications.",
  cough: "Warm fluids, honey (adults), steam inhalation; avoid smoke/irritants.",
  sore_throat: "Warm salt-water gargles, fluids; lozenges (adults) if suitable.",
  cold: "Rest, fluids, saline nasal rinse; most colds settle in 7–10 days.",
};

// naive symptom keying
export function detectSymptomKey(text: string): SymptomKey | null {
  const t = text.toLowerCase();
  if (/\bback pain|low back|lumbar\b/.test(t)) return 'back_pain';
  if (t.includes("fever")) return "fever";
  if (t.includes("headache") || t.includes("migraine")) return "headache";
  if (t.includes("cough")) return "cough";
  if (t.includes("sore throat") || t.includes("throat pain")) return "sore_throat";
  if (t.includes("cold") || t.includes("runny nose")) return "cold";
  return null;
}
