
import { runIOPBand, runIOPCorrected, runSnellenToDecimal, runVFMDSeverity, runWHOHearingGrade, runDermSimple, runEASI } from "../lib/medical/engine/calculators/rare_specialties";

test("IOP bands and corrected", () => {
  expect(runIOPBand({IOP_mmHg:28})!.band).toMatch(/elevated/);
  expect(runIOPCorrected({IOP_mmHg:20, CCT_um:600})!.corrected).toBeGreaterThan(20);
});

test("Vision & hearing", () => {
  expect(runSnellenToDecimal({numerator:20, denominator:40})!.decimal).toBeCloseTo(0.5,2);
  expect(runWHOHearingGrade({PTA_dB:55})!.grade).toMatch(/moderately severe/);
});

test("Derm indices", () => {
  expect(runDermSimple({ area_pct:50, intensity_0_3:3 })!.band).toBe("severe");
  const easi = runEASI({
    head:{area_pct:20,erythema_0_3:2,edema_0_3:2,excoriation_0_3:2,lichen_0_3:1},
    upper:{area_pct:30,erythema_0_3:2,edema_0_3:1,excoriation_0_3:2,lichen_0_3:1},
    trunk:{area_pct:40,erythema_0_3:2,edema_0_3:2,excoriation_0_3:2,lichen_0_3:2},
    lower:{area_pct:50,erythema_0_3:2,edema_0_3:2,excoriation_0_3:2,lichen_0_3:2},
  })!;
  expect(easi.easi).toBeGreaterThan(0);
});

test("VF MD severity", () => {
  expect(runVFMDSeverity({ md_dB: -13 })!.severity).toBe("severe");
});
