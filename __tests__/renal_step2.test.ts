import { runEGFR_CKDEPI2021_CR } from "@/lib/medical/engine/calculators/egfr_ckdepi_2021_cr";
import { runEGFR_CrCys } from "@/lib/medical/engine/calculators/egfr_ckdepi_cr_cys";
import { runCrCl_CG } from "@/lib/medical/engine/calculators/creatinine_clearance_cg";
import { runKDIGO_AKI } from "@/lib/medical/engine/calculators/kdigo_aki_stage";
import { runFeNa } from "@/lib/medical/engine/calculators/fena";
import { runFeUrea } from "@/lib/medical/engine/calculators/feurea";
import { runTTKG } from "@/lib/medical/engine/calculators/ttkg";

test("eGFR CKD-EPI 2021 (Cr)", () => {
  const r = runEGFR_CKDEPI2021_CR({ sex: "female", age: 60, scr_mg_dl: 1.0 });
  expect(r.egfr_ml_min_1_73m2).toBeGreaterThan(50);
  expect(r.egfr_ml_min_1_73m2).toBeLessThan(100);
});

test("eGFR CKD-EPI (Cr+Cys)", () => {
  const r = runEGFR_CrCys({ sex: "male", age: 50, scr_mg_dl: 1.0, scys_mg_l: 1.0 });
  expect(r.egfr_ml_min_1_73m2).toBeGreaterThan(60);
  expect(r.egfr_ml_min_1_73m2).toBeLessThan(120);
});

test("Cockcroft–Gault CrCl", () => {
  const r = runCrCl_CG({ sex: "male", age: 60, weight_kg: 80, scr_mg_dl: 1.0 });
  expect(r.crcl_ml_min).toBeCloseTo(88.9, 1);
});

test("KDIGO AKI staging", () => {
  const r = runKDIGO_AKI({ baseline_scr_mg_dl: 1.0, current_scr_mg_dl: 2.2 });
  expect(r.stage).toBe(2);
});

test("FeNa & FeUrea", () => {
  const fena = runFeNa({ urine_na_meq_l: 10, plasma_na_meq_l: 140, urine_cr_mg_dl: 100, plasma_cr_mg_dl: 2.0 });
  expect(fena.fena_pct).toBeLessThan(1.0);
  const feurea = runFeUrea({ urine_urea_mg_dl: 200, plasma_bun_mg_dl: 40, urine_cr_mg_dl: 100, plasma_cr_mg_dl: 2.0 });
  expect(feurea.feurea_pct).toBeLessThan(35);
});

test("TTKG", () => {
  const r = runTTKG({ urine_k_meq_l: 20, plasma_k_meq_l: 5, urine_osm_mOsm_kg: 570, plasma_osm_mOsm_kg: 285 });
  expect(r.ttkg).toBeCloseTo(2.0, 1);
});
