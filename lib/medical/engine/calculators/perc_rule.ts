import { register } from "../registry";
/**
 * PERC Rule
 * Positive criteria count; PERC negative when count = 0 (with low clinical pretest).
 */
export function calc_perc({
  age_years, heart_rate, spo2_percent, hemoptysis, estrogen_use, prior_dvt_pe, unilateral_leg_swelling, recent_surgery_trauma
}: {
  age_years?: number,
  heart_rate?: number,
  spo2_percent?: number,
  hemoptysis?: boolean,
  estrogen_use?: boolean,
  prior_dvt_pe?: boolean,
  unilateral_leg_swelling?: boolean,
  recent_surgery_trauma?: boolean
}) {
  let pos = 0;
  if ((age_years ?? 0) >= 50) pos += 1;
  if ((heart_rate ?? 0) >= 100) pos += 1;
  if ((spo2_percent ?? 100) < 95) pos += 1;
  if (hemoptysis) pos += 1;
  if (estrogen_use) pos += 1;
  if (prior_dvt_pe) pos += 1;
  if (unilateral_leg_swelling) pos += 1;
  if (recent_surgery_trauma) pos += 1;
  return pos;
}

register({
  id: "perc_rule",
  label: "PERC Rule (PE)",
  tags: ["pulmonology", "emergency"],
  inputs: [
    { key: "age_years" },
    { key: "heart_rate" },
    { key: "spo2_percent" },
    { key: "hemoptysis" },
    { key: "estrogen_use" },
    { key: "prior_dvt_pe" },
    { key: "unilateral_leg_swelling" },
    { key: "recent_surgery_trauma" }
  ],
  run: (ctx) => {
    const v = calc_perc(ctx);
    const notes = [v === 0 ? "PERC negative (if low pretest)" : "PERC positive"];
    return { id: "perc_rule", label: "PERC Rule (PE)", value: v, unit: "criteria", precision: 0, notes };
  },
});
