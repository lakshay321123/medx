import { calc_revised_baux } from "../lib/medical/engine/calculators/revised_baux";

describe("calc_revised_baux", () => {
  it("adds 17 for inhalation injury", () => {
    const noInh = calc_revised_baux({ age_years: 40, tbsa_percent: 30, inhalation_injury: false });
    const inh = calc_revised_baux({ age_years: 40, tbsa_percent: 30, inhalation_injury: true });
    expect(inh - noInh).toBe(17);
  });
});
