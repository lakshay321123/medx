const NUM = /-?\d+(?:\.\d+)?/;

function pickNumber(x: any): number | undefined {
  if (x == null || x === "") return undefined;
  if (typeof x === "number") return Number.isFinite(x) ? x : undefined;
  const m = String(x).match(NUM);
  if (!m) return undefined;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

// Map sloppy labels → canonical keys your calculators expect
const NAME_MAP: Record<string, string> = {
  sodium: "Na", na: "Na", "na+": "Na",
  chloride: "Cl", cl: "Cl", "cl-": "Cl",
  bicarbonate: "HCO3", hco3: "HCO3",
  bun: "BUN_mgdl", urea: "urea_mmol_l", // handle both; we’ll convert urea→BUN below
  glucose: "glucose_mgdl", "glucose_mmol/l": "glucose_mmol_l", "glucose_mmol_l": "glucose_mmol_l",
  albumin: "albumin_gdl", "albumin_g/l": "albumin_g_l",
};

export function normalizeInputs(name: string, inputs: Record<string, any>) {
  // 1) rename sloppy keys
  const i: Record<string, any> = {};
  for (const [k, v] of Object.entries(inputs || {})) {
    const kNorm = (NAME_MAP[k.toLowerCase?.()] || k) as string;
    i[kNorm] = v;
  }

  // 2) coerce common fields to numbers (accept "140 mmol/L" etc.)
  for (const key of Object.keys(i)) i[key] = pickNumber(i[key]);

  const has = (k: string) => Object.prototype.hasOwnProperty.call(i, k);

  // 3) calc-specific unit normalization
  if (name.includes("osmolality") || name.includes("osm")) {
    if (!has("glucose_mgdl") && has("glucose_mmol_l")) i.glucose_mgdl = (i.glucose_mmol_l as number) * 18;
    if (!has("BUN_mgdl") && has("urea_mmol_l")) i.BUN_mgdl = (i.urea_mmol_l as number) * 2.8;
  }
  if (name.includes("anion_gap_albumin_corrected")) {
    if (!has("albumin_gdl") && has("albumin_g_l")) i.albumin_gdl = (i.albumin_g_l as number) / 10;
  }

  // 4) strip NaNs/Infinity
  Object.keys(i).forEach(k => {
    if (typeof i[k] === "number" && !Number.isFinite(i[k])) delete i[k];
  });

  return i;
}

