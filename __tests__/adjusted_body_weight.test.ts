import { runAdjustedBodyWeight } from "@/lib/medical/engine/calculators/adjusted_body_weight";

test("Adjusted body weight", () => {
  const r = runAdjustedBodyWeight({ ibw_kg:70, actual_kg:110 });
  expect(r.adjbw_kg).toBeCloseTo(70 + 0.4*(110-70), 3);
});
