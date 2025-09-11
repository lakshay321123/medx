// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_rcri } from "../lib/medical/engine/calculators/rcri";

describe("calc_rcri", () => {
  it("classifies high risk at >=3", () => {
    const r = calc_rcri({ high_risk_surgery: true, ischemic_hd: true, chf: true, cerebrovascular_disease: false, insulin_tx: false, creatinine_mg_dl: 1.0 });
    expect(r.score).toBe(3);
    expect(r.risk).toBe("high");
  });
});
