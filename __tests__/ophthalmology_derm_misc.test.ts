
import { runIOPBand } from "@/lib/medical/engine/calculators/iop_bands";
import { runVAConvert } from "@/lib/medical/engine/calculators/visual_acuity_conversion";
import { runPASI } from "@/lib/medical/engine/calculators/pasi";
import { runSCORAD } from "@/lib/medical/engine/calculators/scorad";
import { runRuleOfNines } from "@/lib/medical/engine/calculators/bsa_rule_of_nines";
import { runRenalDoseFlags } from "@/lib/medical/engine/calculators/renal_dose_flags";
import { runHepaticDoseFlags } from "@/lib/medical/engine/calculators/hepatic_dose_flags";
test("IOP band", () => {
  expect(runIOPBand({ iop_mmHg: 25 }).band).toBe("ocular_hypertension");
});
test("VA conversion", () => {
  const r = runVAConvert({ snellen_num: 20, snellen_den: 40 });
  expect(r.decimal).toBeCloseTo(0.5, 2);
  expect(r.logMAR).toBeCloseTo(0.30, 2);
});
test("PASI simplified", () => {
  const r = runPASI({
    head: { area_pct: 10, erythema: 2, induration: 2, desquamation: 2 },
    upper:{ area_pct: 20, erythema: 2, induration: 2, desquamation: 2 },
    trunk:{ area_pct: 30, erythema: 2, induration: 2, desquamation: 2 },
    lower:{ area_pct: 40, erythema: 2, induration: 2, desquamation: 2 },
  });
  expect(r.pasi).toBeGreaterThan(0);
});
test("SCORAD bands", () => {
  const r = runSCORAD({ extent_pct: 40, intensity_sum: 10, subjective_sum: 10 });
  expect(r.scorad).toBeGreaterThan(0);
  expect(["mild","moderate","severe"]).toContain(r.band);
});
test("Rule of nines", () => {
  const r = runRuleOfNines({ head: true, arm_left: true, arm_right: false, trunk_anterior: true, trunk_posterior: false, leg_left: true, leg_right: false, perineum: true });
  expect(r.tbsa_pct).toBe(9 + 9 + 18 + 18 + 1);
});
test("Renal/hepatic flags", () => {
  expect(runRenalDoseFlags({ egfr_ml_min_1_73m2: 25 }).band).toBe("severe");
  expect(runHepaticDoseFlags({ child_pugh_points: 11 }).band).toBe("C");
});
