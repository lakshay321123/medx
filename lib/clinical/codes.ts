// Minimal seed maps; extend via config/API later.
export const ICD10: Record<string, string> = {
  "acute myeloid leukemia": "C92.0",
  "asthma": "J45",
  "hepatomegaly": "R16.0",
  "renal dysfunction": "N28.9",
};

export const SNOMED: Record<string, string> = {
  "acute myeloid leukemia": "91861009",
  "asthma": "195967001",
  "hepatomegaly": "80515008",
  "renal dysfunction": "90708001",
};

export const LOINC: Record<string, { code: string; unit: string; ref: string }> = {
  "creatinine": { code: "2160-0", unit: "mg/dL", ref: "0.7–1.3" },
  "bilirubin total": { code: "1975-2", unit: "mg/dL", ref: "0.1–1.2" },
  "alt": { code: "1742-6", unit: "U/L", ref: "≤55" },
};

export const ATC: Record<string, string> = {
  "cytarabine": "L01BC01",
  "methotrexate": "L01BA01",
  "doxorubicin": "L01DB01",
  "beclometasone inhaled": "R03BA01",
};

// Utility: best-effort finding with normalization.
export function codeForDx(term: string) {
  const k = term.trim().toLowerCase();
  return {
    icd10: ICD10[k] || null,
    snomed: SNOMED[k] || null,
  };
}
export function codeForLab(term: string) {
  const k = term.trim().toLowerCase();
  return LOINC[k] || null;
}
export function codeForDrug(term: string) {
  const k = term.trim().toLowerCase();
  return ATC[k] || null;
}
