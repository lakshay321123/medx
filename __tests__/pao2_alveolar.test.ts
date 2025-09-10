import { runPAO2 } from "../lib/medical/engine/calculators/pao2_alveolar";

describe("pao2_alveolar", () => {
  it("computes alveolar oxygen", () => {
    const r = runPAO2({ FiO2: 0.5, PaCO2: 40 });
    expect(r?.PAO2_mmHg).toBeCloseTo(306.5, 1);
  });
});
