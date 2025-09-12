/* eslint-disable @typescript-eslint/no-var-requires */
import "./acid_base_core";
// --- Explicit side-effect imports to avoid tree-shaking of critical calculators ---
import "./news2";
import "./curb_65";
import "./psi_lite";

const SKIP = new Set<string>(["index.ts","acid_base_core.ts","lab_interpretation.ts"]);

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
    ], { eager: true });
    return true;
  } catch { return false; }
}
if (!loadWithWebpack()) loadWithVite();
export {};
