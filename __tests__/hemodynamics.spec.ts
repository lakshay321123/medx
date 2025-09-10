
import { runMAPCalc, runModifiedShockIndex, runRatePressureProduct, runPulsePressureBand, runSVFromLVOT, runCOFromSVHR, runCIFromCOBSA, runSVRDyn, runPVRDyn } from "../lib/medical/engine/calculators/hemodynamics";

test("MAP & MSI", () => {
  expect(runMAPCalc({ SBP:90, DBP:60 })!.MAP_mmHg).toBe(70);
  expect(runModifiedShockIndex({ HR:120, MAP:60 })!.modified_shock_index).toBeCloseTo(2.0,2);
});

test("SV/CO/CI", () => {
  const sv = runSVFromLVOT({ lvot_d_cm:2.0, lvot_vti_cm:20 })!; // area=3.1416, SV≈62.8 mL
  expect(sv.stroke_volume_mL).toBeGreaterThan(50);
  const co = runCOFromSVHR({ stroke_volume_mL:sv.stroke_volume_mL, HR:80 })!;
  expect(co.cardiac_output_L_min).toBeGreaterThan(4.5);
  const ci = runCIFromCOBSA({ cardiac_output_L_min:co.cardiac_output_L_min, BSA_m2:1.9 })!;
  expect(ci.cardiac_index_L_min_m2).toBeGreaterThan(2.0);
});

test("SVR/PVR & bands", () => {
  expect(runSVRDyn({ MAP:70, RAP_mmHg:5, CO_L_min:5 })!.SVR_dyn_s_cm5).toBeGreaterThan(900);
  expect(runPVRDyn({ mPAP_mmHg:25, PCWP_mmHg:10, CO_L_min:5 })!.PVR_dyn_s_cm5).toBeGreaterThan(200);
  expect(runPulsePressureBand({ SBP:140, DBP:70 })!.band).toBe("wide");
});
