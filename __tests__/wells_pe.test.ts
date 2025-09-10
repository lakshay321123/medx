import { runWellsPE } from "@/lib/medical/engine/calculators/wells_pe";

test("Wells PE scoring", () => {
  const r = runWellsPE({ dvt_signs:true, pe_most_likely:true, hr_gt_100:false, immobilization_or_surgery:false, previous_dvt_pe:false, hemoptysis:false, cancer:false });
  expect(r.score).toBe(6);
  expect(r.band).toBe("moderate");
  expect(r.likely).toBe(true);
});
