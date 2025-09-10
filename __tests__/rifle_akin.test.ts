import { runRIFLE, runAKIN } from "../lib/medical/engine/calculators/rifle_akin";

test("RIFLE/AKIN", () => {
  const r = runRIFLE({ creat_baseline_mg_dL: 1.0, creat_current_mg_dL: 2.1, urine_mL_kg_h_12h: 0.4 });
  const a = runAKIN({ creat_baseline_mg_dL: 1.0, creat_current_mg_dL: 2.1, urine_mL_kg_h_6h: 0.4 });
  expect(r.stage).toBeDefined();
  expect(a.stage).toBeGreaterThanOrEqual(0);
});
