// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type MELDNaInputs = {
  creatinine_mg_dl: number;
  bilirubin_mg_dl: number;
  inr: number;
  sodium_mmol_l: number;
  on_dialysis?: boolean;
};

function lnClip(x: number): number {
  return Math.log(Math.max(x, 1.0));
}

export function calc_meld_na(i: MELDNaInputs): { meld: number; meldNa: number } {
  const cr = Math.min(i.on_dialysis ? 4.0 : i.creatinine_mg_dl, 4.0);
  const bili = i.bilirubin_mg_dl;
  const inr = i.inr;
  const meld = Math.round(0.957 * lnClip(cr) + 0.378 * lnClip(bili) + 1.12 * lnClip(inr) + 0.643);
  const na = Math.max(125, Math.min(i.sodium_mmol_l, 137));
  const meldNa = Math.round(meld + 1.32 * (137 - na) - 0.033 * meld * (137 - na));
  return { meld, meldNa: Math.max(6, Math.min(meldNa, 40)) };
}

const def = {
  id: "meld_na",
  label: "MELD-Na",
  inputs: [
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 },
    { id: "bilirubin_mg_dl", label: "Bilirubin (mg/dL)", type: "number", min: 0 },
    { id: "inr", label: "INR", type: "number", min: 0 },
    { id: "sodium_mmol_l", label: "Sodium (mmol/L)", type: "number", min: 100, max: 200 },
    { id: "on_dialysis", label: "On dialysis", type: "boolean" }
  ],
  run: (args: MELDNaInputs) => {
    const r = calc_meld_na(args);
    return { id: "meld_na", label: "MELD-Na", value: r.meldNa, unit: "score", precision: 0, notes: [], extra: r };
  },
};

export default def;
