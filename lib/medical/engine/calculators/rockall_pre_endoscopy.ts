// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type RockallInputs = {
  age_years: number;
  pulse_bpm: number;
  sbp_mm_hg: number;
  comorbidity: "none" | "cardiac_or_major" | "renal_liver_malignancy";
};

export function calc_rockall_pre(i: RockallInputs): number {
  let s = 0;
  // Age
  if (i.age_years >= 80) s += 2;
  else if (i.age_years >= 60) s += 1;
  // Shock
  if (i.sbp_mm_hg < 100) s += 2;
  else if (i.pulse_bpm >= 100) s += 1;
  // Comorbidity
  if (i.comorbidity === "cardiac_or_major") s += 2;
  else if (i.comorbidity === "renal_liver_malignancy") s += 3;
  return s;
}

const def = {
  id: "rockall_pre_endoscopy",
  label: "Rockall (Pre-endoscopy UGIB)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "pulse_bpm", label: "Pulse (bpm)", type: "number", min: 0 },
    { id: "sbp_mm_hg", label: "SBP (mmHg)", type: "number", min: 0 },
    { id: "comorbidity", label: "Comorbidity", type: "select", options: [
      {label:"None", value:"none"},
      {label:"CHF/IHD/major comorbidity", value:"cardiac_or_major"},
      {label:"Renal failure/Liver failure/Disseminated malignancy", value:"renal_liver_malignancy"}
    ]}
  ],
  run: (args: RockallInputs) => {
    const v = calc_rockall_pre(args);
    return { id: "rockall_pre_endoscopy", label: "Rockall (pre-endoscopy)", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
