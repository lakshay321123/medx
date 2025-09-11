export type UpcrInputs = { urine_protein_mg_dl:number; urine_creatinine_mg_dl:number };

export function calc_upcr_mg_g(i: UpcrInputs): number {
  if (i.urine_creatinine_mg_dl <= 0) return NaN;
  const ratio_mg_mg = i.urine_protein_mg_dl / i.urine_creatinine_mg_dl;
  return ratio_mg_mg * 1000; // mg/g
}

const def = {
  id: "urine_protein_creatinine",
  label: "Urine Protein/Creatinine Ratio (UPCR)",
  inputs: [
    { id: "urine_protein_mg_dl", label: "Urine protein (mg/dL)", type: "number", min: 0 },
    { id: "urine_creatinine_mg_dl", label: "Urine creatinine (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: UpcrInputs) => {
    const v = calc_upcr_mg_g(args);
    const notes = [isNaN(v) ? "Invalid (Cr ≤ 0)" : (v >= 300 ? "Nephrotic-range" : (v >= 150 ? "Significant proteinuria" : "Normal/mild"))];
    return { id: "urine_protein_creatinine", label: "UPCR", value: isNaN(v) ? 0 : v, unit: "mg/g", precision: 0, notes };
  },
};
export default def;
