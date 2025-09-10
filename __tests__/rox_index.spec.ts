import { runRox } from "../../lib/medical/engine/calculators/rox_index";

test("ROX computes and bands at 3.85", () => {
  const out1 = runRox({SpO2:92, FiO2:0.8, RR:28})!;
  expect(out1.value).toBeCloseTo(((0.92/0.8)/28), 2);
  expect(out1.risk12h).toBe("high");
  const out2 = runRox({SpO2:98, FiO2:0.4, RR:16})!;
  expect(out2.risk12h).toBe("low");
});
