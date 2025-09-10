
import { runANC, runReticCorrected, runRPI } from "../lib/medical/engine/calculators/hematology";

test("ANC & retics", () => {
  expect(runANC({ WBC_k_uL:8, neutrophil_pct:60, bands_pct:5 })!.ANC_k_uL).toBeCloseTo(5.2,1);
  const rc = runReticCorrected({ retic_pct:4, Hct_frac:0.30 })!;
  expect(rc.retic_corrected_pct).toBeCloseTo(2.67,2);
  expect(runRPI({ retic_corrected_pct: rc.retic_corrected_pct, maturation_factor:2 })!.RPI).toBeCloseTo(1.33,2);
});
