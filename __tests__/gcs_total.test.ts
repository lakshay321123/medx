import { runGCS } from "../lib/medical/engine/calculators/gcs_total";

describe("gcs_total", () => {
  it("sums component scores", () => {
    const r = runGCS({ eye: 3, verbal: 4, motor: 6 });
    expect(r?.total).toBe(13);
  });
});
