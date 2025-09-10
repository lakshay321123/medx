import { register } from "../registry";
/**
 * CHA2DS2-VASc — AF stroke risk
 */
export function calc_chads2vasc({ age_years, sex, chf, htn, dm, stroke_tia, vascular }:
  { age_years: number, sex: "male" | "female", chf?: boolean, htn?: boolean, dm?: boolean, stroke_tia?: boolean, vascular?: boolean }) {
  if (age_years == null || !sex) return null;
  let s = 0;
  if (chf) s += 1;
  if (htn) s += 1;
  if (age_years >= 75) s += 2;
  else if (age_years >= 65) s += 1;
  if (dm) s += 1;
  if (stroke_tia) s += 2;
  if (vascular) s += 1;
  if (sex === "female") s += 1;
  return s;
}

function riskNote(score: number, sex: "male" | "female"): string {
  if (sex === "male") {
    if (score <= 0) return "low risk (consider no anticoagulation)";
    if (score == 1) return "intermediate risk (consider anticoagulation)";
    return "high risk (anticoagulation recommended)";
  } else {
    if (score <= 1) return "low risk (consider no anticoagulation)";
    if (score == 2) return "intermediate risk (consider anticoagulation)";
    return "high risk (anticoagulation recommended)";
  }
}

register({
  id: "chads2vasc",
  label: "CHA₂DS₂-VASc",
  tags: ["cardiology"],
  inputs: [
    { key: "age_years", required: true },
    { key: "sex", required: true },
    { key: "chf" },
    { key: "htn" },
    { key: "dm" },
    { key: "stroke_tia" },
    { key: "vascular" },
  ],
  run: ({ age_years, sex, chf, htn, dm, stroke_tia, vascular }) => {
    const v = calc_chads2vasc({ age_years, sex, chf, htn, dm, stroke_tia, vascular });
    if (v == null) return null;
    const notes = [riskNote(v, sex)];
    return { id: "chads2vasc", label: "CHA₂DS₂-VASc", value: v, unit: "score", precision: 0, notes };
  },
});
