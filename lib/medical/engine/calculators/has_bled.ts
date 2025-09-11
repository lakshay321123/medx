export type HASBLEDInputs = {
  htn: boolean;
  abnormal_renal: boolean;
  abnormal_liver: boolean;
  stroke: boolean;
  bleeding: boolean;
  labile_inr: boolean;
  elderly_over_65: boolean;
  drugs_nsaids_antiplatelets: boolean;
  alcohol_excess: boolean;
};

export function calc_has_bled(i: HASBLEDInputs): number {
  let s = 0;
  if (i.htn) s += 1;
  if (i.abnormal_renal) s += 1;
  if (i.abnormal_liver) s += 1;
  if (i.stroke) s += 1;
  if (i.bleeding) s += 1;
  if (i.labile_inr) s += 1;
  if (i.elderly_over_65) s += 1;
  if (i.drugs_nsaids_antiplatelets) s += 1;
  if (i.alcohol_excess) s += 1;
  return s;
}

const def = {
  id: "has_bled",
  label: "HAS-BLED (bleeding risk)",
  inputs: [
    { id: "htn", label: "Hypertension (SBP >160)", type: "boolean" },
    { id: "abnormal_renal", label: "Abnormal renal function", type: "boolean" },
    { id: "abnormal_liver", label: "Abnormal liver function", type: "boolean" },
    { id: "stroke", label: "Stroke history", type: "boolean" },
    { id: "bleeding", label: "Bleeding history/predisposition", type: "boolean" },
    { id: "labile_inr", label: "Labile INR", type: "boolean" },
    { id: "elderly_over_65", label: "Age >65", type: "boolean" },
    { id: "drugs_nsaids_antiplatelets", label: "Drugs (NSAIDs/antiplatelets)", type: "boolean" },
    { id: "alcohol_excess", label: "Alcohol excess", type: "boolean" }
  ],
  run: (args: HASBLEDInputs) => {
    const v = calc_has_bled(args);
    return { id: "has_bled", label: "HAS-BLED", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
