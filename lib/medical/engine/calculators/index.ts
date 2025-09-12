/* eslint-disable @typescript-eslint/no-var-requires */
import "./acid_base_core";

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
    const mods = g("./*.ts", { eager: true });
    Object.keys(mods).forEach((k) => {
      const file = k.startsWith("./") ? k.slice(2) : k;
      if (SKIP.has(file)) return;
    });
    return true;
  } catch { return false; }
}
if (!loadWithWebpack()) loadWithVite();
export {};
