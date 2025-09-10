import { runHOMA_IR, runHOMA_B, runQUICKI, runTyG } from "../../lib/medical/engine/calculators/homa_quicki_tyg";

test("HOMA-IR", () => {
  expect(runHOMA_IR({Glucose_mg_dL:100, Insulin_uU_mL:10})!.value).toBeCloseTo(1000/405, 2);
});

test("HOMA-B", () => {
  expect(runHOMA_B({Glucose_mg_dL:100, Insulin_uU_mL:10})!.value).toBeCloseTo((360*10)/(100-63), 1);
});

test("QUICKI", () => {
  const out = runQUICKI({Glucose_mg_dL:100, Insulin_uU_mL:10})!;
  expect(out.value).toBeGreaterThan(0);
});

test("TyG", () => {
  const out = runTyG({Glucose_mg_dL:100, Triglycerides_mg_dL:150})!;
  expect(out.value).toBeCloseTo(Math.log((150*100)/2), 3);
});
