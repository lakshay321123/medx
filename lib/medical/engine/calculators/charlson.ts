// lib/medical/engine/calculators/charlson.ts

export interface CharlsonInput {
  age_years?: number | null;

  // 1-point
  mi?: boolean | null;
  chf?: boolean | null;
  pvd?: boolean | null;
  cva_tia?: boolean | null;
  dementia?: boolean | null;
  copd?: boolean | null;
  connective_tissue?: boolean | null;
  pud?: boolean | null;
  liver_mild?: boolean | null;
  diabetes_no_end_organ?: boolean | null;

  // 2-point
  hemiplegia?: boolean | null;
  renal_moderate_severe?: boolean | null;
  diabetes_end_organ?: boolean | null;
  malignancy?: boolean | null; // leukemia/lymphoma/solid tumor (non-metastatic)

  // 3-point
  liver_moderate_severe?: boolean | null;

  // 6-point
  metastatic_solid_tumor?: boolean | null;
  aids?: boolean | null;
}

export interface CharlsonOutput {
  comorbidity_points: number;
  age_points: number;
  total_points: number;
}

function agePts(age:number): number {
  if (age < 50) return 0;
  if (age < 60) return 1;
  if (age < 70) return 2;
  if (age < 80) return 3;
  return 4;
}

export function runCharlson(i: CharlsonInput): CharlsonOutput {
  let pts = 0;
  const add = (b?: boolean | null, w:number=1)=>{ if (b) pts += w; };

  // 1-point
  add(i.mi,1); add(i.chf,1); add(i.pvd,1); add(i.cva_tia,1); add(i.dementia,1);
  add(i.copd,1); add(i.connective_tissue,1); add(i.pud,1); add(i.liver_mild,1);
  add(i.diabetes_no_end_organ,1);

  // 2-point
  add(i.hemiplegia,2); add(i.renal_moderate_severe,2); add(i.diabetes_end_organ,2);
  add(i.malignancy,2);

  // 3-point
  add(i.liver_moderate_severe,3);

  // 6-point
  add(i.metastatic_solid_tumor,6); add(i.aids,6);

  const age = i.age_years ?? 0;
  const apts = agePts(age);
  return { comorbidity_points: pts, age_points: apts, total_points: pts + apts };
}
