  import { calc_ckd_epi_2021 } from "../lib/medical/engine/calculators/ckd_epi_2021";

  describe("calc_ckd_epi_2021", () => {

it("computes eGFR (male 50y, Cr 1.1)", () => {
  const v = calc_ckd_epi_2021({ creatinine_mg_dl: 1.1, age_years: 50, sex: "male" });
  expect(Math.round(v)).toBe(82);
});

  });
