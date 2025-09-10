
import { kingsCollege } from "../lib/medical/engine/calculators/kings_college";

test("KCC APAP pH pathway", () => {
  const out = kingsCollege({ acetaminophen_induced:true, arterial_pH_12h_post_resusc:7.2, inr:2.0, creatinine_mg_dL:1.0, encephalopathy_grade:1 });
  expect(out.meets_criteria).toBe(true);
  expect(out.pathway).toBe("APAP");
});

test("KCC non-APAP multi-criteria", () => {
  const out = kingsCollege({ acetaminophen_induced:false, inr:3.6, creatinine_mg_dL:1.0, encephalopathy_grade:2, age_years:55, jaundice_to_encephalopathy_days:10, etiology_unfavorable:true, bilirubin_mg_dL:20 });
  expect(out.meets_criteria).toBe(true);
  expect(out.pathway).toBe("non-APAP");
});
