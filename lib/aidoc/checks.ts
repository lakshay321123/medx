import type { SymptomKey } from "./triage";

export const SELF_CARE_EDU: Record<SymptomKey,string> = {
  back_pain: "Relative rest 24–48h, heat/ice as preferred, gentle mobility & core stretches; avoid heavy lifting. People sometimes consider paracetamol as per label if appropriate and no allergies.",
  fever: "Hydration, rest, temperature monitoring; people often consider paracetamol as per label dosing if suitable.",
  headache: "Hydration, sleep hygiene, reduce screen strain; paracetamol per label if appropriate.",
  cough: "Warm fluids, honey (adults), steam inhalation; avoid smoke/irritants.",
  sore_throat: "Warm salt-water gargles, fluids; lozenges (adults) if suitable.",
  cold: "Rest, fluids, saline nasal rinse; most colds settle in 7–10 days."
};

export const SUGGESTED_TESTS: Record<SymptomKey,string[]> = {
  back_pain: [
    "Physiotherapy assessment",
    "If persistent > 2–6 weeks or neurologic signs → MRI lumbar spine",
    "If fever/trauma/red flags → urgent clinician review"
  ],
  fever: ["CBC", "malaria rapid/smear (context)", "COVID/flu (if exposure)"],
  headache: ["BP check", "CBC (if systemic)", "eye exam; neuro consult if red flags"],
  cough: ["CBC", "chest X-ray if >3 weeks", "COVID/flu if exposure"],
  sore_throat: ["Throat swab/rapid strep (as applicable)"],
  cold: []
};

// Basic detection
export function detectSymptomKey(text: string): SymptomKey | null {
  const t = text.toLowerCase();
  if (/\bback pain|low back|lumbar\b/.test(t)) return 'back_pain';
  if (/\bfever\b/.test(t)) return 'fever';
  if (/\bheadache|migraine\b/.test(t)) return 'headache';
  if (/\bcough\b/.test(t)) return 'cough';
  if (/\bsore throat|throat pain\b/.test(t)) return 'sore_throat';
  if (/\bcold|runny nose\b/.test(t)) return 'cold';
  return null;
}
