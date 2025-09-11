import { calc_fe_urea } from "../lib/medical/engine/calculators/fe_urea";

describe("calc_fe_urea", () => {
  it("computes (Uurea*Pcr)/(Purea*Ucr)*100", () => {
    const v = calc_fe_urea({ urine_urea_mg_dl: 400, plasma_urea_mg_dl: 40, urine_cr_mg_dl: 100, plasma_cr_mg_dl: 2 });
    expect(v).toBeCloseTo((400*2)/(40*100)*100, 6);
  });
});
