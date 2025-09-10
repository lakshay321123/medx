import { register } from "../registry";

/**
 * Cockcroft–Gault Creatinine Clearance (mL/min)
 * Uses actual body weight
 */
export function calc_cockcroft_gault({
  age_years, weight_kg, sex, serum_creatinine_mg_dl
}: {
  age_years: number,
  weight_kg: number,
  sex: "male" | "female",
  serum_creatinine_mg_dl: number
}) {
  const factor = sex === "female" ? 0.85 : 1.0;
  const crcl = ((140 - age_years) * weight_kg * factor) / (72 * serum_creatinine_mg_dl);
  return crcl;
}

register({
  id: "cockcroft_gault",
  label: "Cockcroft–Gault CrCl",
  tags: ["nephrology", "dosing"],
  inputs: [
    { key: "age_years", required: true },
    { key: "weight_kg", required: true },
    { key: "sex", required: true },
    { key: "serum_creatinine_mg_dl", required: true }
  ],
  run: ({
    age_years, weight_kg, sex, serum_creatinine_mg_dl
  }: {
    age_years: number;
    weight_kg: number;
    sex: "male" | "female";
    serum_creatinine_mg_dl: number;
  }) => {
    const v = calc_cockcroft_gault({ age_years, weight_kg, sex, serum_creatinine_mg_dl });
    return { id: "cockcroft_gault", label: "Cockcroft–Gault CrCl", value: v, unit: "mL/min", precision: 0, notes: [] };
  },
});
