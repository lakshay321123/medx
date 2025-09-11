import { calc_apfel_ponv } from "../lib/medical/engine/calculators/apfel_ponv";

describe("calc_apfel_ponv", () => {
  it("0–4 risk factors", () => {
    const v = calc_apfel_ponv({ female: true, non_smoker: true, history_ponv_motion: false, postoperative_opioids: true });
    expect(v).toBe(3);
  });
});
