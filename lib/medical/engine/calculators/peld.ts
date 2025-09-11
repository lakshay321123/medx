// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type PELDInputs = {
  bilirubin_mg_dl: number;
  inr: number;
  albumin_g_dl: number;
  age_lt_1yr: boolean;
  growth_failure: boolean;
};

function lnClip(x: number, min: number): number {
  return Math.log(Math.max(x, min));
}

export function calc_peld(i: PELDInputs): number {
  const base = 0.480*lnClip(i.bilirubin_mg_dl, 1e-6)
             + 1.857*lnClip(i.inr, 1e-6)
             - 0.687*lnClip(i.albumin_g_dl, 1e-6);
  const age_term = i.age_lt_1yr ? 0.667 : 0;
  const growth = i.growth_failure ? 0.436 : 0;
  return Math.round(base + age_term + growth);
}

const def = {
  id: "peld",
  label: "PELD Score",
  inputs: [
    { id: "bilirubin_mg_dl", label: "Bilirubin (mg/dL)", type: "number", min: 0 },
    { id: "inr", label: "INR", type: "number", min: 0 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0 },
    { id: "age_lt_1yr", label: "Age <1 year", type: "boolean" },
    { id: "growth_failure", label: "Growth failure", type: "boolean" }
  ],
  run: (args: PELDInputs) => {
    const v = calc_peld(args);
    return { id: "peld", label: "PELD", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
