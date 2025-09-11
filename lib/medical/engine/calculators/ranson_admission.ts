// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type RansonAdmissionInputs = {
  etiology: "non_gallstone" | "gallstone";
  age_years: number;
  wbc_k_per_uL: number; // in thousands per uL (e.g., 16 = 16,000)
  glucose_mg_dl: number;
  ldh_u_l: number;
  ast_u_l: number;
};

export function calc_ranson_admission(i: RansonAdmissionInputs): number {
  let s = 0;
  if (i.etiology === "non_gallstone") {
    if (i.age_years > 55) s += 1;
    if (i.wbc_k_per_uL > 16) s += 1;
    if (i.glucose_mg_dl > 200) s += 1;
    if (i.ldh_u_l > 350) s += 1;
    if (i.ast_u_l > 250) s += 1;
  } else {
    if (i.age_years > 70) s += 1;
    if (i.wbc_k_per_uL > 18) s += 1;
    if (i.glucose_mg_dl > 220) s += 1;
    if (i.ldh_u_l > 400) s += 1;
    if (i.ast_u_l > 250) s += 1;
  }
  return s;
}

const def = {
  id: "ranson_admission",
  label: "Ranson Criteria (Admission)",
  inputs: [
    { id: "etiology", label: "Etiology", type: "select", options: [
      {label:"Non-gallstone", value:"non_gallstone"},
      {label:"Gallstone", value:"gallstone"}
    ]},
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "wbc_k_per_uL", label: "WBC (×10³/µL)", type: "number", min: 0 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 },
    { id: "ldh_u_l", label: "LDH (U/L)", type: "number", min: 0 },
    { id: "ast_u_l", label: "AST (U/L)", type: "number", min: 0 }
  ],
  run: (args: RansonAdmissionInputs) => {
    const v = calc_ranson_admission(args);
    return { id: "ranson_admission", label: "Ranson (Admission)", value: v, unit: "criteria", precision: 0, notes: [] };
  },
};

export default def;
