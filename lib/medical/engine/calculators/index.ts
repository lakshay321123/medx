/* eslint-disable @typescript-eslint/no-var-requires */
import "./acid_base_core";

const SKIP = new Set<string>([
  "index.ts",
  "acid_base_core.ts",
  "lab_interpretation.ts",
  "anion_gap.ts",
  "anion_gap_corrected.ts",
  "serum_osmolality.ts",
  "winters_formula.ts",
  "delta_gap.ts",
]);

function loadWithWebpack() {
  try {
    // @ts-ignore
    const ctx = require.context("./", false, /\.ts$/);
    ctx.keys().forEach((k: string) => {
      const file = k.startsWith("./") ? k.slice(2) : k;
      if (!SKIP.has(file)) ctx(k);
    });
    return true;
  } catch { return false; }
}
function loadWithVite() {
  try {
    const g = (import.meta as any)?.glob;
    if (!g) return false;
    g([
      "./*.ts",
      "!./index.ts",
      "!./acid_base_core.ts",
      "!./lab_interpretation.ts",
      "!./anion_gap.ts",
      "!./anion_gap_corrected.ts",
      "!./serum_osmolality.ts",
      "!./winters_formula.ts",
      "!./delta_gap.ts",
    ], { eager: true });
    return true;
  } catch { return false; }
}
if (!loadWithWebpack()) loadWithVite();

// ---- Explicit exports for authoritative runner ----
export function anion_gap({ Na, Cl, HCO3 }: { Na: number; Cl: number; HCO3: number }) {
  return Na - (Cl + HCO3);
}
export function anion_gap_albumin_corrected({ Na, Cl, HCO3, albumin_gdl }: { Na: number; Cl: number; HCO3: number; albumin_gdl: number }) {
  const ag = Na - (Cl + HCO3);
  return ag + 2.5 * (4 - albumin_gdl);
}
export function serum_osmolality({ Na, glucose_mgdl, BUN_mgdl }: { Na: number; glucose_mgdl: number; BUN_mgdl: number }) {
  return 2 * Na + (glucose_mgdl / 18) + (BUN_mgdl / 2.8);
}
export function effective_osmolality({ Na, glucose_mgdl }: { Na: number; glucose_mgdl: number }) {
  return 2 * Na + (glucose_mgdl / 18);
}
export function winter_expected_pco2({ HCO3 }: { HCO3: number }) {
  return 1.5 * HCO3 + 8;
}
export function delta_gap({ Na, Cl, HCO3 }: { Na: number; Cl: number; HCO3: number }) {
  const ag = Na - (Cl + HCO3);
  const deltaAG = ag - 12;
  const deltaHCO3 = 24 - HCO3;
  return deltaAG - deltaHCO3;
}

export {};
