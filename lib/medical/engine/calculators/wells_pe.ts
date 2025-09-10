import { register } from "../registry";
/**
 * Wells Score for Pulmonary Embolism
 * Inputs as booleans; heart_rate used to auto-derive tachycardia.
 */
export function calc_wells_pe({
  dvt_signs, pe_most_likely, heart_rate, recent_surgery_or_immobilization, prior_dvt_pe, hemoptysis, malignancy
}: {
  dvt_signs?: boolean,
  pe_most_likely?: boolean,
  heart_rate?: number,
  recent_surgery_or_immobilization?: boolean,
  prior_dvt_pe?: boolean,
  hemoptysis?: boolean,
  malignancy?: boolean
}) {
  let s = 0;
  if (dvt_signs) s += 3;
  if (pe_most_likely) s += 3;
  if ((heart_rate ?? 0) > 100) s += 1.5;
  if (recent_surgery_or_immobilization) s += 1.5;
  if (prior_dvt_pe) s += 1.5;
  if (hemoptysis) s += 1;
  if (malignancy) s += 1;
  return s;
}

function wellsRisk(score: number): string {
  if (score > 6) return "high pretest probability";
  if (score >= 2) return "moderate pretest probability";
  return "low pretest probability";
}

register({
  id: "wells_pe",
  label: "Wells Score (PE)",
  tags: ["pulmonology", "emergency"],
  inputs: [
    { key: "dvt_signs" },
    { key: "pe_most_likely" },
    { key: "heart_rate" },
    { key: "recent_surgery_or_immobilization" },
    { key: "prior_dvt_pe" },
    { key: "hemoptysis" },
    { key: "malignancy" }
  ],
  run: (ctx) => {
    const v = calc_wells_pe(ctx);
    const notes = [wellsRisk(v)];
    return { id: "wells_pe", label: "Wells Score (PE)", value: v, unit: "score", precision: 1, notes };
  },
});
