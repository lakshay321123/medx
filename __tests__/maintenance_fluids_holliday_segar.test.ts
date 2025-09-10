import { runHollidaySegar } from "@/lib/medical/engine/calculators/maintenance_fluids_holliday_segar";

test("Holliday-Segar", () => {
  const r = runHollidaySegar({ weight_kg:25 });
  expect(r.daily_ml).toBe(100*10 + 50*10 + 20*5);
  expect(r.hourly_ml).toBeCloseTo((100*10 + 50*10 + 20*5)/24, 3);
});
