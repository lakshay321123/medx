type Rule = { required: string[] };

const RULES: Record<string, Rule> = {
  anion_gap: { required: ["Na","Cl","HCO3"] },
  anion_gap_albumin_corrected: { required: ["Na","Cl","HCO3","albumin_gdl"] },
  serum_osmolality: { required: ["Na","glucose_mgdl","BUN_mgdl"] }, // or urea_mmol_l (converted upstream)
  effective_osmolality: { required: ["Na","glucose_mgdl"] },
  winter_expected_pco2: { required: ["HCO3"] },
  delta_gap: { required: ["Na","Cl","HCO3"] },
};

export function validateRequired(name: string, i: Record<string, any>) {
  const rule = RULES[name];
  if (!rule) return { ok: true, missing: [] };
  const missing = rule.required.filter(k => !(k in i) || typeof i[k] !== "number");
  return { ok: missing.length === 0, missing };
}

