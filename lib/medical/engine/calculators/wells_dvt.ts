export type WellsDVTInputs = {
  active_cancer: boolean;
  paralysis_or_recent_immobilization: boolean;
  bedridden_recent_surgery: boolean;
  localized_tenderness: boolean;
  entire_leg_swollen: boolean;
  calf_swelling_ge_3cm: boolean;
  pitting_edema: boolean;
  collateral_superficial_veins: boolean;
  previous_dvt: boolean;
  alternative_diagnosis_more_likely: boolean; // subtracts 2
};

export function calc_wells_dvt(i: WellsDVTInputs): { score: number; risk: "low"|"moderate"|"high" } {
  let s = 0;
  if (i.active_cancer) s += 1;
  if (i.paralysis_or_recent_immobilization) s += 1;
  if (i.bedridden_recent_surgery) s += 1;
  if (i.localized_tenderness) s += 1;
  if (i.entire_leg_swollen) s += 1;
  if (i.calf_swelling_ge_3cm) s += 1;
  if (i.pitting_edema) s += 1;
  if (i.collateral_superficial_veins) s += 1;
  if (i.previous_dvt) s += 1;
  if (i.alternative_diagnosis_more_likely) s -= 2;
  let risk: "low"|"moderate"|"high" = "low";
  if (s >= 3) risk = "high";
  else if (s >= 1) risk = "moderate";
  return { score: s, risk };
}

const def = {
  id: "wells_dvt",
  label: "Wells Score (DVT)",
  inputs: [
    { id: "active_cancer", label: "Active cancer", type: "boolean" },
    { id: "paralysis_or_recent_immobilization", label: "Paralysis/recent immobilization", type: "boolean" },
    { id: "bedridden_recent_surgery", label: "Bedridden ≥3 days or major surgery <12 w", type: "boolean" },
    { id: "localized_tenderness", label: "Localized tenderness along deep veins", type: "boolean" },
    { id: "entire_leg_swollen", label: "Entire leg swollen", type: "boolean" },
    { id: "calf_swelling_ge_3cm", label: "Calf swelling ≥3 cm", type: "boolean" },
    { id: "pitting_edema", label: "Pitting edema (symptomatic leg)", type: "boolean" },
    { id: "collateral_superficial_veins", label: "Collateral superficial veins", type: "boolean" },
    { id: "previous_dvt", label: "Previous DVT", type: "boolean" },
    { id: "alternative_diagnosis_more_likely", label: "Alternative diagnosis as likely or more", type: "boolean" }
  ],
  run: (args: WellsDVTInputs) => {
    const r = calc_wells_dvt(args);
    const notes = [r.risk];
    return { id: "wells_dvt", label: "Wells (DVT)", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
