
import { runFiO2FromNasalCannula, runMinuteVentilation, runStaticCompliance, runDynamicCompliance, runVentilatoryRatio } from "../lib/medical/engine/calculators/vent_mechanics";

test("FiO2 & VE", () => {
  expect(runFiO2FromNasalCannula({ flow_L_min:3 })!.FiO2).toBeCloseTo(0.32,2);
  expect(runMinuteVentilation({ tidal_volume_mL:450, RR:16 })!.VE_L_min).toBeCloseTo(7.2,1);
});

test("Compliances & VR", () => {
  expect(runStaticCompliance({ tidal_volume_mL:400, plateau_cmH2O:22, PEEP_cmH2O:10 })!.Cstat_mL_cmH2O).toBeCloseTo(33.3,1);
  expect(runDynamicCompliance({ tidal_volume_mL:400, peak_cmH2O:30, PEEP_cmH2O:10 })!.Cdyn_mL_cmH2O).toBe(20.0);
  expect(runVentilatoryRatio({ VE_measured_L_min:10, PaCO2_mmHg:50, VE_pred_L_min:7.5 })!.ventilatory_ratio).toBeCloseTo((10*50)/(7.5*40),2);
});
