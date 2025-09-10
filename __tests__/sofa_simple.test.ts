import { runSOFA } from "@/lib/medical/engine/calculators/sofa_simple";

test("SOFA sum", () => {
  const r = runSOFA({ pao2_fio2:120, platelets_x10e3:80, bilirubin_mg_dl:3.0, map_mmHg:60, on_vasopressors:false, gcs:12, creatinine_mg_dl:2.2 });
  expect(r.total).toBeGreaterThanOrEqual(1+2+2+1+2+2);
});
