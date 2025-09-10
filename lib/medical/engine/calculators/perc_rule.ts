import { register } from "../registry";

/**
 * PERC rule (Pulmonary Embolism Rule-out Criteria)
 * Pass = all 8 are true.
 */
export type PERCInputs = {
  age_lt50: boolean;
  hr_lt100: boolean;
  spo2_ge95: boolean;
  no_hemoptysis: boolean;
  no_estrogen: boolean;
  no_prior_dvt_pe: boolean;
  no_unilateral_leg_swelling: boolean;
  no_recent_surgery_trauma: boolean;
};

export function runPERC(i: PERCInputs) {
  const flags = [
    i.age_lt50, i.hr_lt100, i.spo2_ge95, i.no_hemoptysis, i.no_estrogen,
    i.no_prior_dvt_pe, i.no_unilateral_leg_swelling, i.no_recent_surgery_trauma
  ];
  if (flags.some(v => v == null)) return null;
  const passed = flags.every(Boolean);
  const score = flags.filter(Boolean).length;
  const notes = [passed ? "PERC negative (all 8 met)" : "PERC positive (≥1 criterion failed)"];
  return { passed, score, notes };
}

register({
  id: "perc_rule",
  label: "PERC rule",
  inputs: [
    { key: "age_lt50", required: true },
    { key: "hr_lt100", required: true },
    { key: "spo2_ge95", required: true },
    { key: "no_hemoptysis", required: true },
    { key: "no_estrogen", required: true },
    { key: "no_prior_dvt_pe", required: true },
    { key: "no_unilateral_leg_swelling", required: true },
    { key: "no_recent_surgery_trauma", required: true },
  ],
  run: (ctx) => {
    const r = runPERC(ctx as PERCInputs);
    if (!r) return null;
    return { id: "perc_rule", label: "PERC rule", value: r.passed ? "pass" : "fail", notes: r.notes, precision: 0 };
  },
});
