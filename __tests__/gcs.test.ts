import { calc_gcs } from "../lib/medical/engine/calculators/gcs";

describe("calc_gcs", () => {
  it("sums subscores", () => {
    const v = calc_gcs({ eye: 4, verbal: 5, motor: 6 });
    expect(v).toBe(15);
  });
});
