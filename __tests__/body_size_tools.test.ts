import { runIBW, runAdjBW, runBSA } from "../lib/medical/engine/calculators/body_size_tools";

describe("body_size_tools", () => {
  it("calculates Devine IBW", () => {
    const r = runIBW({ sex: "male", height_cm: 180 });
    expect(r?.ibw_kg).toBeCloseTo(75.0, 1);
  });

  it("calculates Adjusted Body Weight", () => {
    const r = runAdjBW({ actual_kg: 100, ibw_kg: 75 });
    expect(r?.adj_bw_kg).toBeCloseTo(85.0, 1);
  });

  it("calculates BSA DuBois", () => {
    const r = runBSA({ weight_kg: 70, height_cm: 170 });
    expect(r?.bsa_m2).toBeCloseTo(1.81, 2);
  });
});
