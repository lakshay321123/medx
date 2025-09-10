/**
 * Heuristic context generator for calculator smoke tests.
 * Attempts to provide reasonable defaults for common medical inputs.
 */
import { InputSpec } from "../lib/medical/engine/registry";

const NUM_DEFAULTS: Record<string, number> = {
  Na: 140, K: 4.0, Cl: 104, HCO3: 24, AG: 12,
  albumin: 4, albumin_g_dL: 4, glucose_mg_dl: 90, bun_mg_dl: 14,
  creatinine_mg_dl: 1.0, weight_kg: 70, height_cm: 170, age: 60,
  SBP: 120, DBP: 75, HR: 80, RR: 16, Temp_C: 37, SpO2: 98,
  PaCO2: 40, PaO2: 90, lactate_mmol_l: 1.5, bilirubin_mg_dl: 0.8,
  platelet_k: 250, INR: 1.0, AST: 20, ALT: 20, sodium_meq_l: 140,
  Na_meq_l: 140, Cl_meq_l: 104, HCO3_meq_l: 24, ethanol_mg_dl: 0,
  measured_osm_mOsm_kg: 290, glu_mg_dL: 90, bun_mg_dL: 14
};

const BOOL_KEYS = new Set([
  "Penetrating","PositiveFAST","pregnant","smoker","male","female",
  "hx_chf","hx_htn","hx_dm","hx_stroke_tia","hx_vascular","diabetes",
  "afib","ascites","encephalopathy","renal_impair","liver_impair",
  "hx_bleed","nsaid","alcohol","oxygen","shock","hypotension"
]);

export function makeContext(inputs: InputSpec[]): Record<string, any> {
  const ctx: Record<string, any> = {};
  for (const inp of inputs) {
    const key = inp.key;
    if (NUM_DEFAULTS[key] != null) {
      ctx[key] = NUM_DEFAULTS[key];
      continue;
    }
    if (BOOL_KEYS.has(key) || /^hx_/.test(key) || /^(is|has|positive|neg)/i.test(key)) {
      ctx[key] = false;
      continue;
    }
    if (key.toLowerCase() === "sex") { ctx[key] = "male"; continue; }
    if (/female|male/.test(key.toLowerCase())) { ctx[key] = false; continue; }
    // fallback: numeric 1
    ctx[key] = 1;
  }
  return ctx;
}
