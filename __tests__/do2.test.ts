import { runDO2 } from "@/lib/medical/engine/calculators/do2";

test("DO2 calc", () => {
  const r = runDO2({ cao2_ml_dl:20, cardiac_output_l_min:5 });
  expect(r.do2_ml_min).toBe(1000);
});
