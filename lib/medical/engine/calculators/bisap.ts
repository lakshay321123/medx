export type BISAPInputs = {
  bun_mg_dl: number;
  impaired_mental_status: boolean;
  sirs_ge_2: boolean;
  age_ge_60: boolean;
  pleural_effusion: boolean;
};

export function calc_bisap(i: BISAPInputs): number {
  let s = 0;
  s += i.bun_mg_dl > 25 ? 1 : 0;
  s += i.impaired_mental_status ? 1 : 0;
  s += i.sirs_ge_2 ? 1 : 0;
  s += i.age_ge_60 ? 1 : 0;
  s += i.pleural_effusion ? 1 : 0;
  return s;
}

const def = {
  id: "bisap",
  label: "BISAP (acute pancreatitis severity)",
  inputs: [
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "impaired_mental_status", label: "Impaired mental status (GCS<15)", type: "boolean" },
    { id: "sirs_ge_2", label: "SIRS ≥2", type: "boolean" },
    { id: "age_ge_60", label: "Age ≥60", type: "boolean" },
    { id: "pleural_effusion", label: "Pleural effusion", type: "boolean" }
  ],
  run: (args: BISAPInputs) => {
    const v = calc_bisap(args);
    return { id: "bisap", label: "BISAP", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
