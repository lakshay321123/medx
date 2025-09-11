export type MELD3Inputs = {
  bilirubin_mg_dl: number;
  creatinine_mg_dl: number;
  inr: number;
  sodium_mmol_l: number;
  albumin_g_dl: number;
  female: boolean;
  dialysis?: boolean;
};

function clamp(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }

export function calc_meld_3_0(i: MELD3Inputs): number {
  const bili = Math.max(1.0, i.bilirubin_mg_dl);
  const inr = Math.max(1.0, i.inr);
  const crea = i.dialysis ? 3.0 : clamp(i.creatinine_mg_dl, 1.0, 3.0);
  const na = clamp(i.sodium_mmol_l, 125, 137);
  const alb = clamp(i.albumin_g_dl, 1.5, 3.5);
  const female = i.female ? 1 : 0;
  const score = 1.33*female
    + 4.56*Math.log(bili)
    + 0.82*(137 - na)
    - 0.24*(137 - na)*Math.log(bili)
    + 9.09*Math.log(inr)
    + 11.14*Math.log(crea)
    + 1.85*(3.5 - alb)
    - 1.83*(3.5 - alb)*Math.log(crea)
    + 6.0;
  const rounded = Math.round(score);
  return Math.max(6, Math.min(40, rounded));
}

const def = {
  id: "meld_3_0",
  label: "MELD 3.0 (liver disease severity)",
  inputs: [
    { id: "bilirubin_mg_dl", label: "Bilirubin (mg/dL)", type: "number", min: 0 },
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 },
    { id: "inr", label: "INR", type: "number", min: 0 },
    { id: "sodium_mmol_l", label: "Sodium (mmol/L)", type: "number", min: 100, max: 170 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0, max: 6 },
    { id: "female", label: "Female", type: "boolean" },
    { id: "dialysis", label: "Dialysis within last week", type: "boolean" }
  ],
  run: (args: MELD3Inputs) => {
    const v = calc_meld_3_0(args);
    return { id: "meld_3_0", label: "MELD 3.0", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
