// --- keep your domain group imports (already known to run on boot) ---
import "./electrolytes";
import "./acid_base";
import "./ecg";
import "./cardiology_risk";
import "./renal";
import "./liver";
import "./pulmonary";
import "./endocrine";
import "./toxicology";
import "./icu";
import "./icu_helpers";
import "./lab_interpretation";

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Analyze + run any calculators not run yet.
 * Strategy:
 * 1) Snapshot current registered calculator IDs if a registry is present.
 * 2) Use Webpack's require.context to scan all .ts modules in this folder.
 * 3) Skip known boot modules and test/type files.
 * 4) Import each remaining file for side-effects; after each import, diff registry to see what new IDs appeared.
 * 5) Expose a report at globalThis.__CALC_IMPORT_REPORT__ and log in dev.
 *
 * Notes:
 * - Works in Next.js' Node/Serverless (Webpack). If you use Edge runtime, move this to a Node route or set `export const runtime = "nodejs";`
 */
declare const require: any;

// helper to read current registry IDs if your app exposes one at "./registry"
type AnyRegistry = Record<string, unknown>;
const getRegistryIds = (): Set<string> => {
  try {
    const reg = require("./registry");
    if (reg && reg.calculators) {
      return new Set(Object.keys(reg.calculators as AnyRegistry));
    }
  } catch {
    // no registry available — fine; we'll still import modules
  }
  return new Set<string>();
};

// Files we never auto-run (barrel itself, domain groups, types, tests)
const SKIP = new Set<string>([
  "index.ts",
  "electrolytes.ts",
  "acid_base.ts",
  "ecg.ts",
  "cardiology_risk.ts",
  "renal.ts",
  "liver.ts",
  "pulmonary.ts",
  "endocrine.ts",
  "toxicology.ts",
  "icu.ts",
  "icu_helpers.ts",
  "lab_interpretation.ts",
]);

// Webpack-only directory context: this folder, non-recursive, any .ts file
const ctx = require.context("./", false, /^\.\/.*\.ts$/);

const already = getRegistryIds(); // IDs registered before scanning
const ranFiles: string[] = []; // files we actually imported now
const newIdsByFile: Record<string, string[]> = {}; // file -> IDs added by this import

ctx.keys().forEach((k: string) => {
  const file = k.slice(2); // "./foo.ts" -> "foo.ts"

  if (SKIP.has(file)) return;
  if (file.endsWith(".d.ts")) return;
  if (file.endsWith(".test.ts")) return;

  const before = getRegistryIds();
  // Side-effect import; if it self-registers, registry will change
  ctx(k);
  ranFiles.push(file);

  const after = getRegistryIds();
  const gained: string[] = [];
  if (after.size >= before.size) {
    after.forEach((id) => {
      if (!before.has(id) && !already.has(id)) gained.push(id);
    });
  }
  if (gained.length) newIdsByFile[file] = gained;
});

// Expose a small report for debugging/verification
if (typeof globalThis !== "undefined") {
  (globalThis as any).__CALC_IMPORT_REPORT__ = {
    importedCount: ranFiles.length,
    ranFiles,
    newIdsByFile,
  };
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[calculators/index] imported", ranFiles.length, "files that were not yet run.");
    Object.entries(newIdsByFile).forEach(([f, ids]) => {
      // eslint-disable-next-line no-console
      console.log(`  ${f} → registered: ${ids.join(", ")}`);
    });
  }
}

