// lib/medical/engine/calculators/charlson.ts
import { round } from "./utils";

export interface CharlsonInput {
  age_years?: number | null;
  mi?: boolean; chf?: boolean; pvd?: boolean; cerebrovascular?: boolean;
  dementia?: boolean; copd?: boolean; rheum?: boolean; pud?: boolean;
  mild_liver?: boolean; diabetes?: boolean;
  diabetes_end_organ?: boolean; hemiplegia?: boolean; mod_severe_renal?: boolean;
  any_tumor?: boolean; leukemia?: boolean; lymphoma?: boolean;
  mod_severe_liver?: boolean; metastatic_solid_tumor?: boolean; aids?: boolean;
}

export function runCharlson(i: CharlsonInput) {
  let pts = 0;
  const add = (b?: boolean, p=0) => { if (b) pts += p; };

  add(i.mi, 1); add(i.chf,1); add(i.pvd,1); add(i.cerebrovascular,1);
  add(i.dementia,1); add(i.copd,1); add(i.rheum,1); add(i.pud,1);
  add(i.mild_liver,1); add(i.diabetes,1);
  add(i.diabetes_end_organ,2); add(i.hemiplegia,2); add(i.mod_severe_renal,2);
  add(i.any_tumor,2); add(i.leukemia,2); add(i.lymphoma,2);
  add(i.mod_severe_liver,3); add(i.metastatic_solid_tumor,6); add(i.aids,6);

  // Age-adjustment: +1 per decade starting 50–59 up to ≥80 → +4
  let agePts = 0;
  if (typeof i.age_years === "number") {
    if (i.age_years >= 80) agePts = 4;
    else if (i.age_years >= 70) agePts = 3;
    else if (i.age_years >= 60) agePts = 2;
    else if (i.age_years >= 50) agePts = 1;
  }

  const total = pts + agePts;
  return { cci_points: pts, age_points: agePts, cci_total: total };
}
