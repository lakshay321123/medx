export type Suggestion = { text: string; modes?: Array<"patient" | "doctor" | "aidoc"> };

export const DEFAULT_PATIENT: string[] = [
  "What is dandruff?",
  "How to get rid of dandruff at home?",
  "Why is my hair falling?",
  "Medication for acne?",
  "Side effects of metformin?",
  "Diet for high blood pressure?",
  "When should I see a doctor for back pain?",
  "Tests for anemia (first line)?",
];

export const DEFAULT_DOCTOR: string[] = [
  "Workup for chest pain (ACS/PE/dissection)",
  "Initial management of sepsis (ED bundle)",
  "Calculate HEART score for chest pain",
  "Empiric antibiotics for CAP (adult)",
  "Disposition criteria for pneumonia (CURB-65/PSI)",
  "Stroke code: imaging + thrombolysis window",
  "Interpret ECG: wide-complex tachycardia",
  "Hyponatremia algorithm (hypo/eu/hypervolemic)",
];

export const DEFAULT_AIDOC: string[] = [
  "Summarize this lab report in simple terms",
  "Explain my CBC (what’s high/low and why)",
  "Interpret my lipid profile and give targets",
  "Compare this ECG with the previous one",
  "Flag red flags in this discharge summary",
  "Extract ICD-10 codes from this report",
  "Suggest follow-up tests with reasoning",
];

export const TRIGGER_WHAT_IS: string[] = [
  "What is dandruff?",
  "What is hair fall (alopecia)?",
  "What is diabetes?",
  "What is PCOS?",
  "What is GERD?",
  "What is migraine?",
];

export const TRIGGER_MED_FOR: string[] = [
  "What is the medication for acne?",
  "What is the medication for back pain?",
  "What is the medication for migraine?",
  "What is the medication for anxiety?",
];

export const TRIGGER_SIDE_EFFECTS: string[] = [
  "Side effects of metformin?",
  "Side effects of isotretinoin?",
  "Side effects of omeprazole?",
];

export const TRIGGER_TEST_FOR: string[] = [
  "Which test for anemia?",
  "Which test for thyroid problems?",
  "Which test for chest pain?",
];

export const TRIGGER_DOC_WORKUP: string[] = [
  "Workup for syncope (San Francisco rule)",
  "Workup for headache (SAH rule-out)",
  "Workup for abdominal pain (RUQ/RLQ/epigastric)",
];
