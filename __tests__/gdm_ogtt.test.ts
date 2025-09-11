import { calc_gdm_ogtt } from "../lib/medical/engine/calculators/gdm_ogtt";
describe("calc_gdm_ogtt", () => {
  it("IADPSG positive if any one abnormal", () => {
    const r = calc_gdm_ogtt({ protocol: "IADPSG_75", fasting_mg_dl: 93, one_hr_mg_dl: 150, two_hr_mg_dl: 120 });
    expect(r.abnormal_count).toBeGreaterThanOrEqual(1);
    expect(r.diagnostic).toBe(true);
  });
  it("CC_100 requires >=2 abnormal", () => {
    const r = calc_gdm_ogtt({ protocol: "CC_100", fasting_mg_dl: 96, one_hr_mg_dl: 170, two_hr_mg_dl: 130, three_hr_mg_dl: 145 });
    expect(r.abnormal_count).toBeGreaterThanOrEqual(2);
    expect(r.diagnostic).toBe(true);
  });
});
