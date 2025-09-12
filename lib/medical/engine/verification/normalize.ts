export function normalizeInputs(name: string, inputs: Record<string, any>) {
  const i = { ...inputs };
  const num = (x: any) => (x === "" || x == null ? undefined : Number(x));
  const has = (k: string) => Object.prototype.hasOwnProperty.call(i, k);

  // Osmolality family: expect mg/dL for glucose & BUN
  if (name.includes("osmolality") || name.includes("osm")) {
    if (!has("glucose_mgdl") && has("glucose_mmol_l")) {
      i.glucose_mgdl = num(i.glucose_mmol_l) * 18;
    } else if (has("glucose_mgdl")) {
      i.glucose_mgdl = num(i.glucose_mgdl);
    }
    if (!has("BUN_mgdl") && has("urea_mmol_l")) {
      i.BUN_mgdl = num(i.urea_mmol_l) * 2.8;
    } else if (has("BUN_mgdl")) {
      i.BUN_mgdl = num(i.BUN_mgdl);
    }
    i.Na = num(i.Na);
  }

  // Albumin correction expects g/dL
  if (name.includes("anion_gap_albumin_corrected")) {
    if (!has("albumin_gdl") && has("albumin_g_l")) {
      i.albumin_gdl = num(i.albumin_g_l) / 10;
    } else if (has("albumin_gdl")) {
      i.albumin_gdl = num(i.albumin_gdl);
    }
  }

  // Generic electrolytes
  if (has("Cl")) i.Cl = num(i.Cl);
  if (has("HCO3")) i.HCO3 = num(i.HCO3);
  if (has("K")) i.K = num(i.K);

  // Strip NaNs quietly
  Object.keys(i).forEach(k => {
    if (typeof i[k] === "number" && !Number.isFinite(i[k])) delete i[k];
  });

  return i;
}
