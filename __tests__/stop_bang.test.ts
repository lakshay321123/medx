import { runSTOPBANG } from "@/lib/medical/engine/calculators/stop_bang";

test("STOP-BANG risk bands", () => {
  const low = runSTOPBANG({ snoring:false, tired:false, observed_apnea:false, high_bp:false, bmi_gt_35:false, age_gt_50:false, neck_cm_gt_40:false, male:false });
  expect(low.score).toBe(0);
  expect(low.risk_band).toBe("low");

  const mid = runSTOPBANG({ snoring:true, tired:true, observed_apnea:false, high_bp:false, bmi_gt_35:false, age_gt_50:false, neck_cm_gt_40:false, male:false });
  expect(mid.score).toBe(2);
  expect(mid.risk_band).toBe("low"); // still low at 2

  const hi = runSTOPBANG({ snoring:true, tired:true, observed_apnea:true, high_bp:true, bmi_gt_35:true, age_gt_50:true, neck_cm_gt_40:true, male:true });
  expect(hi.score).toBe(8);
  expect(hi.risk_band).toBe("high");
});
