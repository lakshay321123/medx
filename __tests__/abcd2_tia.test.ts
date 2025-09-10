import { runABCD2 } from "@/lib/medical/engine/calculators/abcd2_tia";

test("ABCD2 bands", () => {
  const r = runABCD2({ age:70, sbp_mmHg:150, dbp_mmHg:95, unilateral_weakness:true, speech_impairment_without_weakness:false, duration_minutes:75, diabetes:true });
  expect(r.score).toBe(7);
  expect(r.band).toBe("high");
});
