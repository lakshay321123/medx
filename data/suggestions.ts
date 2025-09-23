export type Suggestion = { text: string; modes?: Array<"patient" | "doctor" | "aidoc"> };

export const THERAPY_SUGGESTIONS: string[] = [
  "feeling stressed today?",
  "anxiety showing up?",
  "low mood right now?",
  "sleep been off?",
  "racing thoughts?",
  "overthinking loop?",
  "feeling on edge?",
  "talk through a trigger?",
  "set one tiny goal?",
  "want 60-sec grounding?",
  "one-minute breathing?",
  "feeling lonely lately?",
  "trouble focusing?",
  "tension in body?",
  "do you feel safe?",
];

export const WELLNESS_SUGGESTIONS: string[] = [
  "why am I losing hair?",
  "best fix for dandruff?",
  "quickest acne routine?",
  "fade dark spots safely?",
  "cure for skin rash?",
  "lose belly fat facts?",
  "Indian diet for weight loss?",
  "daily protein target?",
  "is intermittent fasting safe?",
  "creatine/whey safe?",
  "beginner home workout?",
  "improve sleep fast?",
  "fix bloating/IBS?",
  "raise VO₂max quickly?",
  "do I need multivitamins?",
  "PCOS: weight & periods?",
  "prediabetes: what to eat?",
  "thyroid high: diet tips?",
  "reverse fatty liver?",
  "lower LDL with diet?",
];

export const DOCTOR_SUGGESTIONS: string[] = [
  "septic shock: fluids → pressors?",
  "hs-troponin 0/1/3 rule-in/out?",
  "PE: when to thrombolyse?",
  "severe hypoNa: correction plan?",
  "DKA: insulin, K⁺, dextrose?",
  "VAP: empiric abx with MDR?",
  "AF eGFR<30: anticoag choice?",
  "NSTEMI HBR: invasive & DAPT?",
  "HFrEF low BP: GDMT sequence?",
  "adrenal crisis: first steps?",
  "CRRT: abx dosing?",
  "COPD: NIV vs intubation?",
  "stroke low ASPECTS/posterior: EVT?",
  "CAP in pregnancy: safest abx?",
  "severe hyperK⁺: restart RAAS when?",
  "septic arthritis: tap & OR timing?",
  "cancer-VTE with thrombocytopenia?",
  "first seizure: work-up & driving?",
  "IV→PO sepsis switch rules?",
  "peri-op risk: RCRI/NSQIP & meds?",
];

export const WELLNESS_RESEARCH_SUGGESTIONS: string[] = [
  "best fat-loss diet (keep muscle)?",
  "high-protein veg: long-term safety?",
  "IF vs daily restriction results?",
  "creatine + whey: real benefits?",
  "zone-2 vs HIIT vs steps?",
  "what truly reduces “belly fat”?",
  "hair fall: minoxidil/finasteride data?",
  "acne: BPO vs adapalene vs combo?",
  "collagen: skin/joint evidence?",
  "14-day better sleep plan?",
  "IBS: low-FODMAP vs probiotics?",
  "LDL: which diet change wins?",
  "reverse NAFLD with diet?",
  "multivitamins: when useful?",
  "PCOS: best weight strategy?",
  "prediabetes: A1C-drop plan?",
  "creatine for women/older adults?",
  "fastest stamina gains?",
  "fade pigmentation: which active?",
  "best 20-min home workout?",
];

export const DOCTOR_RESEARCH_SUGGESTIONS: string[] = [
  "septic shock: early pressor & vasopressin?",
  "CKD: apply hs-troponin algorithms?",
  "intermediate-high PE: systemic vs CDT vs AC?",
  "symptomatic hypoNa: bolus vs infusion?",
  "DKA vs HHS: protocol specifics?",
  "VAP w/ prior carbapenem: empiric & de-escalation?",
  "NV-AF eGFR<30: DOAC vs VKA outcomes?",
  "NSTEMI HBR: invasive strategy & minimum DAPT?",
  "HFrEF hypotension: safe GDMT sequencing?",
  "stroke (low ASPECTS/posterior): EVT windows?",
  "CAP in pregnancy: safest regimens?",
  "severe hyperK⁺: when to restart RAAS?",
  "septic knee: WBC/PMN cutoffs & OR timing?",
  "cancer-VTE + thrombocytopenia: agent & dose-reduce?",
  "first unprovoked seizure: start ASM & driving?",
  "stewardship: IV→PO criteria & outcomes?",
  "peri-op cardiac risk: tests & meds to hold?",
  "CRRT hemodialysis: updated abx dosing?",
  "TB vs NTM: GeneXpert & initial regimen?",
  "dengue: fluids across phases & platelet triggers?",
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
