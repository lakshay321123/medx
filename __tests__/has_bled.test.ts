
import { hasBled } from "../lib/medical/engine/calculators/has_bled";

test("HAS-BLED points", () => {
  const out = hasBled({ hypertension:true, abnormal_renal:true, abnormal_liver:true, stroke_history:true, bleeding_history_or_predisposition:true, labile_inr:false, elderly_gt_65:true, drugs_predisposing_bleeding:true, alcohol_excess:true });
  expect(out.points).toBe(8);
});
