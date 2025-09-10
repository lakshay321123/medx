
import { runDKASeverity, runSepsisBundleFlag, runARDSSeverity, runShockIndexBands } from "../lib/medical/engine/calculators/composite_engines";

test("DKA severity", () => {
  expect(runDKASeverity({ pH:7.1, HCO3:10 })!.severity).toBe("moderate");
  expect(runDKASeverity({ pH:6.95, HCO3:8 })!.severity).toBe("severe");
});

test("Sepsis bundle flag", () => {
  expect(runSepsisBundleFlag({ MAP:60 })!.bundle_flag).toBe(true);
  expect(runSepsisBundleFlag({ SBP:120, Lactate:1.5 })!.bundle_flag).toBe(false);
});

test("ARDS severity", () => {
  const out = runARDSSeverity({ PaO2:60, FiO2:0.8, ventilatory_support:true })!;
  expect(out.severity).toBe("severe");
});

test("Shock index bands", () => {
  const out = runShockIndexBands({ HR:130, SBP:90 })!;
  expect(out.band).toBe("critical");
});
