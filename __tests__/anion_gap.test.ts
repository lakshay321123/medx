import { calc_anion_gap } from "../lib/medical/engine/calculators/anion_gap";

describe("calc_anion_gap", () => {
  it("Na - (Cl + HCO3)", () => {
    const v = calc_anion_gap({ na_mmol_l: 140, cl_mmol_l: 100, hco3_mmol_l: 24 });
    expect(v).toBe(16);
  });
});
