
import { runAPRI, runFIB4, runMaddreyDF } from "../lib/medical/engine/calculators/hepato_gi";

test("APRI/FIB-4/Maddrey", () => {
  expect(runAPRI({ AST_IU_L:80, ULN_AST_IU_L:40, platelets_k_uL:200 })!.APRI).toBeCloseTo(1.0,1);
  const f4 = runFIB4({ age_y:50, AST_IU_L:80, ALT_IU_L:60, platelets_k_uL:200 })!;
  expect(f4.FIB4).toBeGreaterThan(1.0);
  expect(runMaddreyDF({ PT_patient_s:20, PT_control_s:12, bilirubin_mg_dL:10 })!.Maddrey_DF).toBeCloseTo(4.6*8+10,1);
});
