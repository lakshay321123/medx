import { runKingsCollege } from "../lib/medical/engine/calculators/kings_college";
import { runKhorana } from "../lib/medical/engine/calculators/khorana";
import { runBAP65 } from "../lib/medical/engine/calculators/bap65";
import { crosses150Line } from "../lib/medical/engine/calculators/acetaminophen_nomogram";

test("King's College APAP pH criterion", () => {
  const apap = runKingsCollege({ apap_induced: true, arterial_pH: 7.2 });
  expect(apap.transplant_criteria_met).toBe(true);
});

test("Khorana high risk", () => {
  const k = runKhorana({ site: "pancreas", platelets_x10e9_L: 360, hemoglobin_g_dL: 9.9, on_erythropoiesis_stim_agents: false, leukocytes_x10e9_L: 12, bmi_kg_m2: 36 });
  expect(k.khorana_points).toBeGreaterThanOrEqual(4);
  expect(k.risk_band).toBe("high");
});

test("BAP-65", () => {
  const b = runBAP65({ bun_mg_dL: 28, altered_mental_status: true, pulse_bpm: 120, age_years: 70 });
  expect(b.bap65_points).toBe(4);
  expect(b.class_roman).toBe("V");
});

test("Acetaminophen 150-line", () => {
  const res = crosses150Line(200, 4);
  expect(res.above_line).toBe(true);
});
