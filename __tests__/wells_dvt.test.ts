  import { calc_wells_dvt } from "../lib/medical/engine/calculators/wells_dvt";

  describe("calc_wells_dvt", () => {

it("scores Wells DVT (high)", () => {
  const v = calc_wells_dvt({
    active_cancer: true,
    paralysis_paresis_recent_plaster: true,
    recently_bedridden_or_major_surgery: true,
    localized_tenderness_deep_veins: true,
    entire_leg_swollen: true,
    calf_swelling_gt_3cm: true,
    pitting_edema_symptomatic_leg: true,
    collateral_superficial_veins: true,
    alternative_diagnosis_as_likely: false,
  });
  expect(v).toBe(8);
});

  });
