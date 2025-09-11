export type TIMISTEMIInputs = {
  age_years: number;
  dm_htn_or_angina: boolean;
  sbp_mm_hg: number;
  hr_bpm: number;
  killip_class: "I"|"II"|"III"|"IV";
  weight_kg: number;
  anterior_stemi_or_lbbb: boolean;
  time_to_treatment_hours: number;
};

export function calc_timi_stemi(i: TIMISTEMIInputs): number {
  let s = 0;
  if (i.age_years >= 75) s += 3;
  else if (i.age_years >= 65) s += 2;
  if (i.dm_htn_or_angina) s += 1;
  if (i.sbp_mm_hg < 100) s += 3;
  if (i.hr_bpm > 100) s += 2;
  if (i.killip_class !== "I") s += 2;
  if (i.weight_kg < 67) s += 1;
  if (i.anterior_stemi_or_lbbb) s += 1;
  if (i.time_to_treatment_hours > 4) s += 1;
  return s;
}

const def = {
  id: "timi_stemi",
  label: "TIMI Risk Score (STEMI)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "dm_htn_or_angina", label: "Diabetes/HTN/angina", type: "boolean" },
    { id: "sbp_mm_hg", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "killip_class", label: "Killip class", type: "select", options: [{label:"I", value:"I"},{label:"II", value:"II"},{label:"III", value:"III"},{label:"IV", value:"IV"}] },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 400 },
    { id: "anterior_stemi_or_lbbb", label: "Anterior STE or LBBB", type: "boolean" },
    { id: "time_to_treatment_hours", label: "Time to treatment (h)", type: "number", min: 0 }
  ],
  run: (args: TIMISTEMIInputs) => {
    const v = calc_timi_stemi(args);
    return { id: "timi_stemi", label: "TIMI STEMI", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
