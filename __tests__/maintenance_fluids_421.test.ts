import { runMaintenanceFluids421 } from "@/lib/medical/engine/calculators/maintenance_fluids_421";

test("Maintenance fluids 4-2-1", () => {
  const r = runMaintenanceFluids421({ weight_kg:70 });
  // 10*4 + 10*2 + 50*1 = 40 + 20 + 50 = 110 mL/hr
  expect(r.rate_ml_hr).toBe(110);
});
