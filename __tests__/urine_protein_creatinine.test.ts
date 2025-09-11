import { calc_upcr_mg_g } from "../lib/medical/engine/calculators/urine_protein_creatinine";
describe("calc_upcr_mg_g", () => {
  it("converts mg/dL ratio to mg/g", () => {
    const v = calc_upcr_mg_g({ urine_protein_mg_dl: 30, urine_creatinine_mg_dl: 100 });
    expect(v).toBeCloseTo(300, 6);
  });
});
