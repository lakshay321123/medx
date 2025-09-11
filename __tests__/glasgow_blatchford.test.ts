// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_glasgow_blatchford } from "../lib/medical/engine/calculators/glasgow_blatchford";

describe("calc_glasgow_blatchford", () => {
  it("adds points across domains", () => {
    const v = calc_glasgow_blatchford({
      bun_mg_dl: 30, hb_g_dl: 9.5, sex: "male", sbp: 95, pulse: 110,
      melena: true, syncope: true, hepatic_disease: true, cardiac_failure: false
    });
    expect(v).toBeGreaterThan(0);
  });
});
