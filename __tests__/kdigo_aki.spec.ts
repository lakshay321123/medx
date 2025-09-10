
import { runKDIGO } from "../lib/medical/engine/calculators/kdigo_aki";

test("KDIGO", ()=>{
  const out = runKDIGO({ creat_mg_dL_current:3.0, creat_mg_dL_baseline:1.0, creat_rise_mg_dL_48h:0.6, urine_mL_kg_h_12h:0.4 })!;
  expect(out.KDIGO_stage).toBeGreaterThanOrEqual(2);
});
