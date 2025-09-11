// Batch 14 test
import { calc_sofa } from "../lib/medical/engine/calculators/sofa";

describe("calc_sofa", () => {
  it("adds subscores correctly", () => {
    const r = calc_sofa({
      pao2_fio2: 150, platelets_10e9_l: 80, bilirubin_mg_dl: 3.0,
      map_mm_hg: 65, vasopressors: "dopamine_le_5", gcs: 12, creatinine_mg_dl: 2.5, urine_ml_day: 400
    });
    const total = r.subscores.resp + r.subscores.coag + r.subscores.liver + r.subscores.cardio + r.subscores.cns + r.subscores.renal;
    expect(r.total).toBe(total);
  });
});
