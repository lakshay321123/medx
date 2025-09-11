import { calc_gcs } from "../lib/medical/engine/calculators/gcs";

describe("calc_gcs", () => {
  it("sums eye+verbal+motor and classifies", () => {
    const r = calc_gcs({ eye: 4, verbal: 5, motor: 6 });
    expect(r.score).toBe(15);
    expect(r.category).toBe("mild");
  });
});
