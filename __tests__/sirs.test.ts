import { calc_sirs } from "../lib/medical/engine/calculators/sirs";

describe("calc_sirs", () => {
  it("meets SIRS when >=2", () => {
    const v = calc_sirs({ temp_c: 39, HR: 120, RR: 18, WBC: 7 });
    expect(v).toBe(2);
  });
});
