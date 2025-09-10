
import { runBMI, runMifflin, runHarrisBenedict, runPennState, runTEE, runProteinGoals, runNitrogenBalance, runGIR } from "../lib/medical/engine/calculators/nutrition_metabolism";

test("BMI bands", () => {
  expect(runBMI({weight_kg:70, height_cm:175})!.category).toBe("Normal");
});

test("Mifflin and Harris compute", () => {
  expect(runMifflin({sex:"M", weight_kg:80, height_cm:180, age_y:40})!.bmr).toBeGreaterThan(1500);
  expect(runHarrisBenedict({sex:"F", weight_kg:60, height_cm:165, age_y:35})!.bmr).toBeGreaterThan(1200);
});

test("Penn State selects model", () => {
  const out = runPennState({ msj_bmr:1600, VE_L_min:8, Tmax_C:38, age_y:65, bmi:32 })!;
  expect(out.preferred).toBeDefined();
});

test("TEE and Protein goals", () => {
  expect(runTEE({ bmr:1600, activity_factor:1.3 })!.tee).toBe(2080);
  const prot = runProteinGoals({ weight_kg:80, bmi:35 })!;
  expect(prot.grams_per_day_low).toBeGreaterThan(0);
});

test("Nitrogen balance and GIR", () => {
  const nb = runNitrogenBalance({ protein_g_day:100, UUN_g_day:12 })!;
  expect(nb.nitrogen_balance).toBeCloseTo(100/6.25 - 16, 2);
  const gir = runGIR({ rate_mL_h:100, dextrose_percent:10, weight_kg:70 })!;
  expect(gir.mg_per_kg_min).toBeGreaterThan(0);
});
