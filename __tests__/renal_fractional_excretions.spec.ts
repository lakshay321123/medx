import { runFENa, runFEUrea, runFECl, runTTKG, runOsmolarGap } from "../../lib/medical/engine/calculators/renal_fractional_excretions";

test("FENa basic", () => {
  const out = runFENa({UrineX:40, PlasmaX:140, UrineCr:100, PlasmaCr:2})!;
  expect(out.value).toBeCloseTo((40*2)/(140*100)*100, 2);
});

test("FEUrea basic", () => {
  const out = runFEUrea({UrineX:300, PlasmaX:30, UrineCr:100, PlasmaCr:2})!;
  expect(out.value).toBeCloseTo((300*2)/(30*100)*100, 2);
});

test("FECl basic", () => {
  const out = runFECl({UrineX:60, PlasmaX:100, UrineCr:100, PlasmaCr:2})!;
  expect(out.value).toBeCloseTo((60*2)/(100*100)*100, 2);
});

test("TTKG basic", () => {
  const out = runTTKG({UrineK:60, PlasmaK:5, UrineOsm:600, PlasmaOsm:300})!;
  expect(out.value).toBeCloseTo((60/5)*(300/600), 2);
});

test("Osmolar gap", () => {
  const out = runOsmolarGap({Na:140, Glucose:90, BUN:14, MeasuredOsm:295})!;
  const calc = 2*140 + 90/18 + 14/2.8 + 0/4.6;
  expect(out.calculated).toBeCloseTo(calc, 1);
  expect(out.gap).toBeCloseTo(295 - calc, 1);
});
