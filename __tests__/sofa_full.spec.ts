
import { runSOFA } from "../lib/medical/engine/calculators/sofa_full";

test("SOFA full", ()=>{
  const out = runSOFA({ PaO2_mmHg:70, FiO2:0.5, platelets_k_uL:40, bilirubin_mg_dL:7, map_mmHg:65, norepi_ug_kg_min:0.08, gcs_total:9, creat_mg_dL:3.6, urine_mL_per_kg_h:0.4 })!;
  expect(out.SOFA_total).toBeGreaterThanOrEqual(12);
  expect(out.subscores.coag).toBe(3);
});
