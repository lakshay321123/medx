import { runAAG } from "../lib/medical/engine/calculators/a_a_gradient_calc";

describe("a_a_gradient_calc", () => {
  it("computes A–a gradient", () => {
    const r = runAAG({ PaO2: 80, FiO2: 0.21, PaCO2: 40, age_years: 40 });
    expect(r?.AA).toBeCloseTo(19.73, 2);
  });
});
