
import { runGAP } from "../lib/medical/engine/calculators/gap_ipf";

test("GAP staging", () => {
  expect(runGAP({ sex: "male", age_years: 70, fvc_percent_pred: 60, dlco_percent_pred: 30 }).GAP_stage).toBe("III");
  expect(runGAP({ sex: "female", age_years: 55, fvc_percent_pred: 80, dlco_percent_pred: 65 }).GAP_stage).toBe("I");
});
