import { runApfelPONV } from "@/lib/medical/engine/calculators/apfel_ponv";

test("Apfel PONV", () => {
  const r = runApfelPONV({ female:true, non_smoker:true, history_ponv_or_motion:false, postop_opioids:true });
  expect(r.score).toBe(3);
});
