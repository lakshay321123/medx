import { runRCRI } from "@/lib/medical/engine/calculators/rcri";

test("RCRI basic scoring", () => {
  const low = runRCRI({
    high_risk_surgery: false,
    ischemic_hd: false,
    heart_failure: false,
    cerebrovascular: false,
    insulin_treated_dm: false,
    creatinine_mg_dl: 1.1,
  });
  expect(low.points).toBe(0);
  expect(low.risk_band).toBe("low");

  const mid = runRCRI({
    high_risk_surgery: true,
    ischemic_hd: false,
    heart_failure: false,
    cerebrovascular: false,
    insulin_treated_dm: false,
    creatinine_mg_dl: 1.0,
  });
  expect(mid.points).toBe(1);
  expect(mid.risk_band).toBe("intermediate");

  const high = runRCRI({
    high_risk_surgery: true,
    ischemic_hd: true,
    heart_failure: false,
    cerebrovascular: false,
    insulin_treated_dm: false,
    creatinine_mg_dl: 2.5,
  });
  expect(high.points).toBe(3);
  expect(high.risk_band).toBe("high");
});
