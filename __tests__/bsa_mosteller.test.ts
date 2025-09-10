import { runBSAMosteller } from "@/lib/medical/engine/calculators/bsa_mosteller";

test("BSA Mosteller", () => {
  const r = runBSAMosteller({ height_cm:180, weight_kg:80 });
  expect(r.bsa_m2).toBeCloseTo(Math.sqrt((180*80)/3600), 5);
});
