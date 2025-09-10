import { runOI, runOSI } from "../../lib/medical/engine/calculators/oxygenation_index";

test("OI and OSI compute", () => {
  expect(runOI({FiO2:0.8, mPaw:15, PaO2:60})!.OI).toBeCloseTo((0.8*15*100)/60, 2);
  expect(runOSI({FiO2:0.6, mPaw:12, SpO2:90})!.OSI).toBeCloseTo((0.6*12*100)/90, 2);
});
