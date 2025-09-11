export type FEUreaInputs = { uurea_mg_dl: number; purea_mg_dl: number; ucr_mg_dl: number; pcr_mg_dl: number };

export function calc_feurea({ uurea_mg_dl, purea_mg_dl, ucr_mg_dl, pcr_mg_dl }: FEUreaInputs): number {
  if (purea_mg_dl <= 0 || ucr_mg_dl <= 0 || pcr_mg_dl <= 0) return NaN;
  return (uurea_mg_dl * pcr_mg_dl) / (purea_mg_dl * ucr_mg_dl) * 100;
}

const def = {
  id: "feurea",
  label: "Fractional Excretion of Urea (FEUrea)",
  inputs: [
    { id: "uurea_mg_dl", label: "Urine Urea (mg/dL)", type: "number", min: 0 },
    { id: "purea_mg_dl", label: "Plasma Urea (mg/dL)", type: "number", min: 1 },
    { id: "ucr_mg_dl", label: "Urine Creatinine (mg/dL)", type: "number", min: 1 },
    { id: "pcr_mg_dl", label: "Plasma Creatinine (mg/dL)", type: "number", min: 0.1 }
  ],
  run: (args: FEUreaInputs) => {
    const v = calc_feurea(args);
    return { id: "feurea", label: "FEUrea", value: v, unit: "%", precision: 2, notes: [] };
  },
};

export default def;
