import { runNUTRIC } from "@/lib/medical/engine/calculators/nutric_simplified";

test("NUTRIC high risk", () => {
  const r = runNUTRIC({ age:76, apache_ii:30, sofa:11, comorbidity_count:2, days_hospital_to_icu:2 });
  expect(r.score).toBeGreaterThanOrEqual(3+3+2+1+1);
  expect(r.high_risk).toBe(true);
});
