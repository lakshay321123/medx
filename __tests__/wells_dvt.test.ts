import { runWellsDVT } from "@/lib/medical/engine/calculators/wells_dvt";

test("Wells DVT bands", () => {
  const r = runWellsDVT({ active_cancer:true, paralysis_or_cast:false, bedridden_recent:true, localized_tenderness:true, entire_leg_swollen:false, calf_swelling_3cm:true, pitting_edema:false, collateral_superficial_veins:false, previous_dvt:false, alternative_diagnosis_more_likely:false });
  expect(r.score).toBe(4);
  expect(r.band).toBe("high");
});
