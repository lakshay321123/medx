import { calc_maddrey_df } from "../lib/medical/engine/calculators/maddrey_df";

describe("calc_maddrey_df", () => {
  it("computes DF from PT prolongation and bilirubin", () => {
    const v = calc_maddrey_df({ pt_patient_sec: 20, pt_control_sec: 12, bilirubin_mg_dl: 15 });
    expect(v).toBeCloseTo(52.0, 1);
  });
});
