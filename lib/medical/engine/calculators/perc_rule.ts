export type PERCInputs = {
  age_lt_50: boolean;
  hr_lt_100: boolean;
  sao2_ge_95: boolean;
  no_hemoptysis: boolean;
  no_estrogen_use: boolean;
  no_prior_dvt_pe: boolean;
  no_unilateral_leg_swelling: boolean;
  no_recent_surgery_or_trauma: boolean;
};

export function calc_perc_rule(i: PERCInputs): { positive_count: number; perc_negative: boolean } {
  const items = [
    i.age_lt_50, i.hr_lt_100, i.sao2_ge_95, i.no_hemoptysis,
    i.no_estrogen_use, i.no_prior_dvt_pe, i.no_unilateral_leg_swelling, i.no_recent_surgery_or_trauma
  ];
  const positive = items.filter(Boolean).length;
  return { positive_count: positive, perc_negative: positive === 8 };
}

const def = {
  id: "perc_rule",
  label: "PERC Rule (PE)",
  inputs: [
    { id: "age_lt_50", label: "Age <50", type: "boolean" },
    { id: "hr_lt_100", label: "Heart rate <100", type: "boolean" },
    { id: "sao2_ge_95", label: "SaO2 ≥95%", type: "boolean" },
    { id: "no_hemoptysis", label: "No hemoptysis", type: "boolean" },
    { id: "no_estrogen_use", label: "No estrogen use", type: "boolean" },
    { id: "no_prior_dvt_pe", label: "No prior DVT/PE", type: "boolean" },
    { id: "no_unilateral_leg_swelling", label: "No unilateral leg swelling", type: "boolean" },
    { id: "no_recent_surgery_or_trauma", label: "No recent surgery/trauma", type: "boolean" }
  ],
  run: (args: PERCInputs) => {
    const r = calc_perc_rule(args);
    const notes = [r.perc_negative ? "PERC negative (if low pretest)" : "PERC positive"];
    return { id: "perc_rule", label: "PERC Rule (PE)", value: r.positive_count, unit: "criteria", precision: 0, notes, extra: r };
  },
};

export default def;
