export type MeldNaInputs = { creatinine_mg_dl:number; bilirubin_mg_dl:number; inr:number; sodium_mmol_l:number };

export function calc_meld_na(i: MeldNaInputs): { meld:number; meldNa:number } {
  const cr = Math.max(1, Math.min(4, i.creatinine_mg_dl));
  const bili = Math.max(1, i.bilirubin_mg_dl);
  const inr = Math.max(1, i.inr);
  const Na = Math.max(125, Math.min(137, i.sodium_mmol_l));
  const meld = 0.957*Math.log(cr) + 0.378*Math.log(bili) + 1.12*Math.log(inr) + 0.643;
  const meld_round = Math.round(meld * 10) / 10;
  const meldNa = Math.round((meld_round + 1.59*(135 - Na)));
  return { meld: meld_round, meldNa };
}

const def = {
  id: "meld_na",
  label: "MELD-Na",
  inputs: [
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 },
    { id: "bilirubin_mg_dl", label: "Bilirubin (mg/dL)", type: "number", min: 0 },
    { id: "inr", label: "INR", type: "number", min: 0 },
    { id: "sodium_mmol_l", label: "Sodium (mmol/L)", type: "number", min: 80, max: 200 }
  ],
  run: (args: MeldNaInputs) => {
    const r = calc_meld_na(args);
    return { id: "meld_na", label: "MELD-Na", value: r.meldNa, unit: "score", precision: 0, notes: [], extra: r };
  },
};

export default def;
