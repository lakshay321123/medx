
import { runGCSTotalBand, runGestationalAgeFromLMP, runGDM75gFlag } from "../lib/medical/engine/calculators/neuro_ob";

test("GCS", () => {
  expect(runGCSTotalBand({ E:4, V:4, M:6 })!.GCS_total).toBe(14);
});

test("Gestational age from LMP", () => {
  const out = runGestationalAgeFromLMP({ lmp_iso: "2025-07-01", today_iso: "2025-09-10" })!;
  expect(out.gestational_weeks).toBeGreaterThan(9);
});

test("GDM 75g flag", () => {
  expect(runGDM75gFlag({ fasting_mg_dL:95, one_hr_mg_dL:160, two_hr_mg_dL:140 })!.gdm_flag).toBe(true);
});
