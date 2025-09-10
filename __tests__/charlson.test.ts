
import { charlson } from "../lib/medical/engine/calculators/charlson";

test("Charlson points and age-adjusted", () => {
  const out = charlson({ mi:true, chf:true, copd:true, any_tumor:true, metastatic_solid_tumor:true, age_years:72 });
  expect(out.cci).toBe(1+1+1+2+6);
  expect(out.age_adjusted_cci).toBe(out.cci + 3);
});
