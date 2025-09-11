export type HASBLEDInputs = {
  hypertension: boolean;
  abnormal_renal: boolean;
  abnormal_liver: boolean;
  stroke: boolean;
  bleeding: boolean;
  labile_inr: boolean;
  elderly_age_ge_65: boolean;
  drugs: boolean; // antiplatelets/NSAIDs
  alcohol: boolean; // >=8 drinks/week
};

export function calc_has_bled(i: HASBLEDInputs): number {
  let s = 0;
  s += i.hypertension ? 1 : 0;
  s += (i.abnormal_renal ? 1 : 0) + (i.abnormal_liver ? 1 : 0);
  s += i.stroke ? 1 : 0;
  s += i.bleeding ? 1 : 0;
  s += i.labile_inr ? 1 : 0;
  s += i.elderly_age_ge_65 ? 1 : 0;
  s += i.drugs ? 1 : 0;
  s += i.alcohol ? 1 : 0;
  return s;
}

const def = {
  id: "has_bled",
  label: "HAS-BLED (bleeding risk in AF)",
  inputs: [
    { id: "hypertension", label: "Hypertension (SBP>160)", type: "boolean" },
    { id: "abnormal_renal", label: "Abnormal renal function", type: "boolean" },
    { id: "abnormal_liver", label: "Abnormal liver function", type: "boolean" },
    { id: "stroke", label: "Prior stroke", type: "boolean" },
    { id: "bleeding", label: "Bleeding history / predisposition", type: "boolean" },
    { id: "labile_inr", label: "Labile INR", type: "boolean" },
    { id: "elderly_age_ge_65", label: "Age ≥65", type: "boolean" },
    { id: "drugs", label: "Drugs (antiplatelets/NSAIDs)", type: "boolean" },
    { id: "alcohol", label: "Alcohol ≥8 drinks/week", type: "boolean" }
  ],
  run: (args: HASBLEDInputs) => {
    const v = calc_has_bled(args);
    return { id: "has_bled", label: "HAS-BLED", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
