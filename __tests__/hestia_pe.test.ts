import { hestiaEligibility } from "../lib/medical/engine/calculators/hestia_pe";

test("Hestia eligible when all false", () => {
  const out = hestiaEligibility({});
  expect(out.eligible_outpatient).toBe(true);
  expect(out.failed_criteria.length).toBe(0);
});

test("Hestia not eligible when any true", () => {
  const out = hestiaEligibility({ hemodynamic_instability: true, pregnancy: true });
  expect(out.eligible_outpatient).toBe(false);
  expect(out.failed_criteria.length).toBeGreaterThan(0);
});
