// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_osmolar_gap } from "../lib/medical/engine/calculators/osmolar_gap";

describe("calc_osmolar_gap", () => {
  it("subtracts calculated from measured", () => {
    const r = calc_osmolar_gap({ measured_mosm_kg: 310, sodium_mmol_l: 140, glucose_mg_dl: 90, bun_mg_dl: 14, ethanol_mg_dl: 0 });
    const calc = 2*140 + 90/18 + 14/2.8;
    expect(r.calculated).toBeCloseTo(calc, 3);
    expect(r.gap).toBeCloseTo(310 - calc, 3);
  });
});
