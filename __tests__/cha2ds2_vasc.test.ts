
import { cha2ds2vasc } from "../lib/medical/engine/calculators/cha2ds2_vasc";

test("CHA2DS2-VASc sample", () => {
  const out = cha2ds2vasc({ congestive_heart_failure:true, hypertension:true, age_years:78, diabetes:true, stroke_tia_thromboembolism:true, vascular_disease:true, sex_female:true });
  expect(out.points).toBe(9);
});
