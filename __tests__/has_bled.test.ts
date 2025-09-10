import { runHASBLED } from "@/lib/medical/engine/calculators/has_bled";

test("HAS-BLED sum", () => {
  const r = runHASBLED({ htn:true, renal_abnormal:true, liver_abnormal:false, stroke:false, bleeding:true, labile_inr:true, age_gt_65:true, drugs:false, alcohol:true });
  expect(r.score).toBe(6);
});
