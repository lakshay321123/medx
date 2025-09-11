import { calc_rcri } from "../lib/medical/engine/calculators/rcri";

describe("calc_rcri", () => {
  it("scores 3 for three risk factors", () => {
    const v = calc_rcri({
      high_risk_surgery: true,
      history_ischemic_hd: false,
      history_chf: true,
      history_cvd: false,
      insulin_therapy: true,
      creatinine_mg_dl: 1.2
    });
    expect(v).toBe(3);
  });
});
