import { calc_maddrey_df } from "../lib/medical/engine/calculators/maddrey_df";

describe("calc_maddrey_df", () => {
  it("applies 4.6*(PT diff)+bili", () => {
    const v = calc_maddrey_df({ pt_patient_sec: 14, pt_control_sec: 12, bilirubin_mg_dl: 2 });
    expect(v).toBeCloseTo(4.6*(2)+2, 6);
  });
});
