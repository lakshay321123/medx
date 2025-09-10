import { runBicarbonateDeficit } from "@/lib/medical/engine/calculators/bicarbonate_deficit";

test("Bicarbonate deficit", () => {
  const r = runBicarbonateDeficit({ weight_kg:70, current_hco3:12, desired_hco3:22 });
  expect(r.deficit_meq).toBeCloseTo(0.5*70*10, 2);
});
