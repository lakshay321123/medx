
// lib/medical/engine/calculators/fephos_femg.ts

export interface FEInput {
  urine_analyte_mg_dL: number;   // U_analyte
  plasma_analyte_mg_dL: number;  // P_analyte
  urine_creatinine_mg_dL: number;// U_Cr
  plasma_creatinine_mg_dL: number;// P_Cr
}

export interface FEOutput { fe_percent: number; }

export function runFEPhos(i: FEInput): FEOutput {
  const num = i.urine_analyte_mg_dL * i.plasma_creatinine_mg_dL;
  const den = Math.max(1e-6, i.plasma_analyte_mg_dL * i.urine_creatinine_mg_dL);
  return { fe_percent: 100 * (num/den) };
}

// FEMg uses 0.7 factor for protein-bound fraction of plasma Mg
export function runFEMg(i: FEInput): FEOutput {
  const num = i.urine_analyte_mg_dL * i.plasma_creatinine_mg_dL;
  const den = Math.max(1e-6, i.plasma_analyte_mg_dL * i.urine_creatinine_mg_dL * 0.7);
  return { fe_percent: 100 * (num/den) };
}
