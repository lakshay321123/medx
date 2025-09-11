// Batch 14 test
import { calc_nexus_cspine } from "../lib/medical/engine/calculators/nexus_cspine";

describe("calc_nexus_cspine", () => {
  it("true only when all criteria met", () => {
    const r = calc_nexus_cspine({ no_midline_tenderness: true, no_intoxication: true, normal_alertness: true, no_focal_neurologic_deficit: true, no_painful_distracting_injury: true });
    expect(r.all_low_risk).toBe(true);
  });
});
