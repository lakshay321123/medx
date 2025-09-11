// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_ttkg } from "../lib/medical/engine/calculators/ttkg";

describe("calc_ttkg", () => {
  it("computes ratio", () => {
    const v = calc_ttkg({ urine_k_mmol_l: 60, plasma_k_mmol_l: 3, urine_osm_mosm_kg: 600, plasma_osm_mosm_kg: 300 });
    expect(v).toBeCloseTo((60/3) * (300/600), 3);
  });
});
