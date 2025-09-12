// lib/medical/engine/calculators/index.ts
/* eslint-disable @typescript-eslint/no-var-requires */
// Load canonical set first so it "wins" id collisions.
import "./acid_base_core";

// Dynamic discovery that works in both webpack/Turbopack and Vite.
const SKIP = new Set<string>([
  "index.ts",
  "acid_base_core.ts",
  "lab_interpretation.ts",
]);

function loadWithWebpack() {
  try {
    // webpack / Turbopack path
    // @ts-ignore - only defined in webpack/Turbopack builds
    const ctx = require.context("./", false, /\.ts$/);
    ctx.keys().forEach((k: string) => {
      const file = k.startsWith("./") ? k.slice(2) : k; // "./foo.ts" -> "foo.ts"
      if (SKIP.has(file)) return;
      ctx(k); // side-effects register calculators
    });
    return true;
  } catch {
    return false;
  }
}

function loadWithVite() {
  try {
    const g = (import.meta as any)?.glob;
    if (!g) return false;
    const mods = g("./*.ts", { eager: true });
    Object.keys(mods).forEach((k) => {
      const file = k.startsWith("./") ? k.slice(2) : k; // "./foo.ts" -> "foo.ts"
      if (SKIP.has(file)) return;
      // eager import already executed side-effects
    });
    return true;
  } catch {
    return false;
  }
}

// Prefer webpack/Turbopack in Next.js; fall back to Vite if present.
if (!loadWithWebpack()) loadWithVite();

export {};
