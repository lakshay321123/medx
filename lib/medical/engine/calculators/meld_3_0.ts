// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type MELD3Inputs = {
  sex: "male" | "female";
  bilirubin_mg_dl: number;
  inr: number;
  creatinine_mg_dl: number;
  sodium_mmol_l: number;
  albumin_g_dl: number;
};

function lnClip(x: number, min: number): number {
  return Math.log(Math.max(x, min));
}

export function calc_meld_3_0({
  sex, bilirubin_mg_dl, inr, creatinine_mg_dl, sodium_mmol_l, albumin_g_dl
}: MELD3Inputs): number {
  const isFemale = sex === "female" ? 1 : 0;
  const Na = Math.min(Math.max(sodium_mmol_l, 125), 137);
  const Alb = Math.min(Math.max(albumin_g_dl, 1.5), 3.5);
  const Cr = Math.min(Math.max(creatinine_mg_dl, 1.0), 3.0);
  const Bil = Math.max(bilirubin_mg_dl, 1.0);
  const INR = Math.max(inr, 1.0);

  const meld = 1.33*isFemale
    + 4.56*lnClip(Bil, 1.0)
    + 0.82*(137 - Na)
    - 0.24*(137 - Na)*lnClip(Bil, 1.0)
    + 9.09*lnClip(INR, 1.0)
    + 11.14*lnClip(Cr, 1.0)
    + 1.85*(3.5 - Alb)
    - 1.83*(3.5 - Alb)*lnClip(Cr, 1.0)
    + 6;

  return Math.round(meld);
}

const def = {
  id: "meld_3_0",
  label: "MELD 3.0",
  inputs: [
    { id: "sex", label: "Sex", type: "select", options: [{label: "Male", value: "male"}, {label: "Female", value: "female"}] },
    { id: "bilirubin_mg_dl", label: "Bilirubin (mg/dL)", type: "number", min: 0 },
    { id: "inr", label: "INR", type: "number", min: 0 },
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 },
    { id: "sodium_mmol_l", label: "Sodium (mmol/L)", type: "number", min: 100, max: 200 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0 }
  ],
  run: (args: MELD3Inputs) => {
    const v = calc_meld_3_0(args);
    return { id: "meld_3_0", label: "MELD 3.0", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
