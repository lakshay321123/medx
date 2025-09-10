
import { runRenalDosingFlag, runHepaticDosingFlag, runDrugLevelBand, runVancomycinBand, runPhenytoinCorrected, runWarfarinBand, runQTc } from "../lib/medical/engine/calculators/pharmacology_bands";

test("Renal/hepatic flags", () => {
  expect(runRenalDosingFlag({eGFR:25})!.flag).toMatch(/reduce/);
  const hep = runHepaticDosingFlag({ bilirubin_mg_dL:3, albumin_g_dL:3.0, INR:2.0, ascites:"mild", encephalopathy:"none" })!;
  expect(["A","B","C"]).toContain(hep.child_pugh);
});

test("Drug bands & vanc", () => {
  expect(runDrugLevelBand({drug:"lithium", level:0.8})!.band).toMatch(/therapeutic/);
  expect(runVancomycinBand({trough_mcg_mL:22})!.band).toMatch(/high/);
});

test("Phenytoin correction & Warfarin", () => {
  expect(runPhenytoinCorrected({ total_mcg_mL:8, albumin_g_dL:2.0 })!.corrected).toBeGreaterThan(8);
  expect(runWarfarinBand({ inr:2.5, mechanical_valve:false })!.band).toBe("therapeutic");
});

test("QTc", () => {
  const out = runQTc({ QT_ms:400, HR_bpm:60, sex:"F" })!;
  expect(out.QTc_Bazett_ms).toBeGreaterThan(0);
});
