export type WellsDVTInputs = {
  active_cancer: boolean;
  paralysis_paresis_or_cast: boolean;
  recently_bedridden_or_surgery: boolean;
  localized_tenderness_dvt: boolean;
  entire_leg_swollen: boolean;
  calf_swelling_gt_3cm: boolean;
  pitting_edema_symptomatic_leg: boolean;
  collateral_superficial_veins: boolean;
  previous_dvt: boolean;
  alternative_diagnosis_as_likely: boolean; // -2
};

export function calc_wells_dvt(i: WellsDVTInputs): { score:number; risk:"low"|"moderate"|"high" } {
  let s = 0;
  s += i.active_cancer ? 1 : 0;
  s += i.paralysis_paresis_or_cast ? 1 : 0;
  s += i.recently_bedridden_or_surgery ? 1 : 0;
  s += i.localized_tenderness_dvt ? 1 : 0;
  s += i.entire_leg_swollen ? 1 : 0;
  s += i.calf_swelling_gt_3cm ? 1 : 0;
  s += i.pitting_edema_symptomatic_leg ? 1 : 0;
  s += i.collateral_superficial_veins ? 1 : 0;
  s += i.previous_dvt ? 1 : 0;
  s += i.alternative_diagnosis_as_likely ? -2 : 0;
  let risk:"low"|"moderate"|"high" = "low";
  if (s >= 3) risk = "high";
  else if (s >= 1) risk = "moderate";
  return { score: s, risk };
}

const def = {
  id: "wells_dvt",
  label: "Wells Score (DVT)",
  inputs: [
    { id: "active_cancer", label: "Active cancer", type: "boolean" },
    { id: "paralysis_paresis_or_cast", label: "Paralysis/paresis or recent plaster immobilization", type: "boolean" },
    { id: "recently_bedridden_or_surgery", label: "Bedridden >3 days or major surgery <12 weeks", type: "boolean" },
    { id: "localized_tenderness_dvt", label: "Localized tenderness along deep venous system", type: "boolean" },
    { id: "entire_leg_swollen", label: "Entire leg swollen", type: "boolean" },
    { id: "calf_swelling_gt_3cm", label: "Calf swelling >3 cm vs. other leg", type: "boolean" },
    { id: "pitting_edema_symptomatic_leg", label: "Pitting edema confined to symptomatic leg", type: "boolean" },
    { id: "collateral_superficial_veins", label: "Collateral superficial (nonvaricose) veins", type: "boolean" },
    { id: "previous_dvt", label: "Previous DVT", type: "boolean" },
    { id: "alternative_diagnosis_as_likely", label: "Alternative diagnosis as likely/more likely", type: "boolean" }
  ],
  run: (args: WellsDVTInputs) => {
    const r = calc_wells_dvt(args);
    const notes = [r.risk];
    return { id: "wells_dvt", label: "Wells (DVT)", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
