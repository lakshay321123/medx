export type WellsDVTInputs = {
  active_cancer: boolean;
  paralysis_paresis_recent_cast: boolean;
  bedridden_3d_or_major_surgery_12w: boolean;
  localized_tenderness: boolean;
  entire_leg_swollen: boolean;
  calf_swelling_gt_3cm: boolean;
  pitting_edema_symptomatic_leg: boolean;
  collateral_superficial_veins: boolean;
  prior_dvt: boolean;
  alternative_dx_as_likely: boolean; // subtract 2 if true
};

export function calc_wells_dvt(i: WellsDVTInputs): { score: number; category: "low"|"moderate"|"high" } {
  let s = 0;
  if (i.active_cancer) s += 1;
  if (i.paralysis_paresis_recent_cast) s += 1;
  if (i.bedridden_3d_or_major_surgery_12w) s += 1;
  if (i.localized_tenderness) s += 1;
  if (i.entire_leg_swollen) s += 1;
  if (i.calf_swelling_gt_3cm) s += 1;
  if (i.pitting_edema_symptomatic_leg) s += 1;
  if (i.collateral_superficial_veins) s += 1;
  if (i.prior_dvt) s += 1;
  if (i.alternative_dx_as_likely) s -= 2;
  let category: "low"|"moderate"|"high" = "low";
  if (s >= 3) category = "high";
  else if (s >= 1) category = "moderate";
  return { score: s, category };
}

const def = {
  id: "wells_dvt",
  label: "Wells Score (DVT)",
  inputs: [
    { id: "active_cancer", label: "Active cancer", type: "boolean" },
    { id: "paralysis_paresis_recent_cast", label: "Paralysis/paresis or recent plaster immobilization", type: "boolean" },
    { id: "bedridden_3d_or_major_surgery_12w", label: "Bedridden ≥3 days or major surgery within 12 weeks", type: "boolean" },
    { id: "localized_tenderness", label: "Localized tenderness along deep veins", type: "boolean" },
    { id: "entire_leg_swollen", label: "Entire leg swollen", type: "boolean" },
    { id: "calf_swelling_gt_3cm", label: "Calf swelling >3 cm (below tibial tuberosity)", type: "boolean" },
    { id: "pitting_edema_symptomatic_leg", label: "Pitting edema confined to symptomatic leg", type: "boolean" },
    { id: "collateral_superficial_veins", label: "Collateral superficial (nonvaricose) veins", type: "boolean" },
    { id: "prior_dvt", label: "Previous DVT", type: "boolean" },
    { id: "alternative_dx_as_likely", label: "Alternative diagnosis as likely as DVT", type: "boolean" }
  ],
  run: (args: WellsDVTInputs) => {
    const r = calc_wells_dvt(args);
    const notes = [r.category];
    return { id: "wells_dvt", label: "Wells DVT", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
