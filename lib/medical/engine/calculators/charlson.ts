
// lib/medical/engine/calculators/charlson.ts
// Charlson Comorbidity Index (CCI) with optional age adjustment.

export interface CharlsonInput {
  // 1-point conditions
  mi?: boolean; chf?: boolean; pvd?: boolean; cerebrovascular?: boolean; dementia?: boolean;
  copd?: boolean; connective_tissue?: boolean; peptic_ulcer?: boolean; mild_liver?: boolean; diabetes?: boolean;
  // 2-point
  hemiplegia?: boolean; moderate_severe_renal?: boolean; diabetes_endorgan?: boolean;
  any_tumor?: boolean; leukemia?: boolean; lymphoma?: boolean;
  // 3-point
  moderate_severe_liver?: boolean;
  // 6-point
  metastatic_solid_tumor?: boolean; aids?: boolean;
  // age (optional for age-adjusted Charlson)
  age_years?: number;
}

export interface CharlsonOutput {
  cci: number;
  age_adjusted_cci?: number;
}

export function charlson(i: CharlsonInput): CharlsonOutput {
  let cci = 0;
  // 1 point
  const onePts = ["mi","chf","pvd","cerebrovascular","dementia","copd","connective_tissue","peptic_ulcer","mild_liver","diabetes"] as const;
  onePts.forEach(k => { if ((i as any)[k]) cci += 1; });
  // 2 points
  const twoPts = ["hemiplegia","moderate_severe_renal","diabetes_endorgan","any_tumor","leukemia","lymphoma"] as const;
  twoPts.forEach(k => { if ((i as any)[k]) cci += 2; });
  // 3 points
  if (i.moderate_severe_liver) cci += 3;
  // 6 points
  if (i.metastatic_solid_tumor) cci += 6;
  if (i.aids) cci += 6;

  let out: CharlsonOutput = { cci };
  if (typeof i.age_years === "number") {
    let ageAdj = cci;
    if (i.age_years >= 80) ageAdj += 4;
    else if (i.age_years >= 70) ageAdj += 3;
    else if (i.age_years >= 60) ageAdj += 2;
    else if (i.age_years >= 50) ageAdj += 1;
    out.age_adjusted_cci = ageAdj;
  }
  return out;
}
