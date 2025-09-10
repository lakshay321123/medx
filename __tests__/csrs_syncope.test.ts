import { runCSRS } from "../lib/medical/engine/calculators/csrs_syncope";

test("CSRS very low risk case", () => {
  const out = runCSRS({
    predisposition_to_vasovagal_symptoms: true,
    ed_diagnosis_vasovagal: true,
  });
  expect(out.score).toBe(-3);
  expect(out.category).toBe("Very low");
});
