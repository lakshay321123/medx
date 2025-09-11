import { calc_osmolar_gap } from "../lib/medical/engine/calculators/osmolar_gap";

describe("calc_osmolar_gap", () => {
  it("measured - calculated", () => {
    const r = calc_osmolar_gap({ na_mmol_l: 140, glucose_mg_dl: 90, bun_mg_dl: 14, measured_mosm_kg: 300 });
    const calc = 2*140 + 90/18 + 14/2.8 + 0/3.7;
    expect(r.calculated).toBeCloseTo(calc, 6);
    expect(r.gap).toBeCloseTo(300 - calc, 6);
  });
});
