import { runSF } from "../lib/medical/engine/calculators/sf_ratio";

describe("sf_ratio", () => {
  it("calculates S/F ratio", () => {
    const r = runSF({ SpO2_pct: 95, FiO2: 0.5 });
    expect(r?.sf_ratio).toBeCloseTo(190, 0);
  });
});
