import { shockIndex, modifiedShockIndex, diastolicShockIndex, ageShockIndex } from "../lib/medical/engine/calculators/shock_indices";

test("Shock Index basics", () => {
  const si = shockIndex(100, 100);
  expect(si.si).toBe(1.0);
  const msi = modifiedShockIndex(90, 60);
  expect(msi.msi).toBeCloseTo(1.5, 2);
  const dsi = diastolicShockIndex(90, 45);
  expect(dsi.dsi).toBe(2.0);
  const asi = ageShockIndex(70, 100, 100);
  expect(asi.asi).toBe(70);
});
