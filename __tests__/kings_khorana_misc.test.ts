import { kingsCollegeTransplantCriteria } from "../lib/medical/engine/calculators/kings_college";
import { runKhorana } from "../lib/medical/engine/calculators/khorana";
import { canadianCSpineRule } from "../lib/medical/engine/calculators/cspine_rule";
import { rumackMatthewThreshold } from "../lib/medical/engine/calculators/acetaminophen_nomogram";
import { coSeverity, cyanideSupport } from "../lib/medical/engine/calculators/toxic_helpers";

test("King's College", () => {
  const out = kingsCollegeTransplantCriteria({ acetaminophen_related: false, arterial_pH: 7.2, inr: 7.0, creat_mg_dL: 3.5, encephalopathy_grade: 3 });
  expect(out.meets_criteria).toBe(true);
});

test("Khorana", () => {
  const out = runKhorana({ cancer_site: "lung", platelets_10e9_L: 360, hemoglobin_g_dL: 9.8, on_esa: false, leukocytes_10e9_L: 12, bmi_kg_m2: 36 });
  expect(out.score).toBeGreaterThan(0);
});

test("C-Spine", () => {
  const out = canadianCSpineRule({ age_ge_65: false, dangerous_mechanism: false, paresthesias_in_extremities: false, low_risk_factor_present: true, able_to_rotate_45deg_left_and_right: true });
  expect(out.imaging_indicated).toBe(false);
});

test("Rumack–Matthew", () => {
  const out = rumackMatthewThreshold({ hours_post_ingestion: 8, acetaminophen_ug_mL: 160 });
  expect(out.above_line).toBe(true);
});

test("CO/Cyanide helpers", () => {
  expect(coSeverity(30).severe).toBe(true);
  expect(cyanideSupport(12, true).supportive).toBe(true);
});
