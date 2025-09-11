import { calc_gcs } from "../lib/medical/engine/calculators/glasgow_coma_scale";

describe("calc_gcs", () => {
  it("ranges 3–15", () => {
    const r = calc_gcs({ eye: 4, verbal: 5, motor: 6 });
    expect(r.total).toBe(15);
    expect(r.category).toBe("mild");
  });
});
