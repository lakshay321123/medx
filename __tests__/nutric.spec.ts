
import { runModifiedNUTRIC } from "../lib/medical/engine/calculators/nutric";

test("mNUTRIC", ()=>{
  const out = runModifiedNUTRIC({ age_years:70, apache_ii:24, sofa:9, comorbidities_count:2, days_from_hospital_to_icu:2 })!;
  expect(out.mNUTRIC).toBeGreaterThanOrEqual(5);
  expect(out.high_risk).toBe(true);
});
