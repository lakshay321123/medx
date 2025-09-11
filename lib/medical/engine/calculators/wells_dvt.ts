// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type WellsDVTInputs = {
  active_cancer: boolean;
  paralysis_immobilization: boolean;
  bedridden_3d_or_surgery_12w: boolean;
  localized_tenderness: boolean;
  entire_leg_swollen: boolean;
  calf_swelling_ge_3cm: boolean;
  pitting_edema_symptomatic_leg: boolean;
  collateral_superficial_veins: boolean;
  previous_dvt: boolean;
  alternative_dx_as_likely: boolean; // subtract 2 if true
};

export function calc_wells_dvt(i: WellsDVTInputs): number {
  let s = 0;
  if (i.active_cancer) s += 1;
  if (i.paralysis_immobilization) s += 1;
  if (i.bedridden_3d_or_surgery_12w) s += 1;
  if (i.localized_tenderness) s += 1;
  if (i.entire_leg_swollen) s += 1;
  if (i.calf_swelling_ge_3cm) s += 1;
  if (i.pitting_edema_symptomatic_leg) s += 1;
  if (i.collateral_superficial_veins) s += 1;
  if (i.previous_dvt) s += 1;
  if (i.alternative_dx_as_likely) s -= 2;
  return s;
}

const def = {
  id: "wells_dvt",
  label: "Wells Score (DVT)",
  inputs: [
    { id: "active_cancer", label: "Active cancer", type: "boolean" },
    { id: "paralysis_immobilization", label: "Paralysis/immobilization", type: "boolean" },
    { id: "bedridden_3d_or_surgery_12w", label: "Bedridden >3d or major surgery <12w", type: "boolean" },
    { id: "localized_tenderness", label: "Localized tenderness (deep veins)", type: "boolean" },
    { id: "entire_leg_swollen", label: "Entire leg swollen", type: "boolean" },
    { id: "calf_swelling_ge_3cm", label: "Calf swelling ≥3 cm", type: "boolean" },
    { id: "pitting_edema_symptomatic_leg", label: "Pitting edema (symptomatic leg)", type: "boolean" },
    { id: "collateral_superficial_veins", label: "Collateral superficial veins", type: "boolean" },
    { id: "previous_dvt", label: "Previous DVT", type: "boolean" },
    { id: "alternative_dx_as_likely", label: "Alternative diagnosis as likely", type: "boolean" }
  ],
  run: (args: WellsDVTInputs) => {
    const v = calc_wells_dvt(args);
    return { id: "wells_dvt", label: "Wells (DVT)", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
