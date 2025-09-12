// Canonical calculators index:
// - Imports domain bundles once (avoid double registration)
// - Scans this folder for single-file calculators and registers them
// - Skips known bundle/helper files

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

import { FORMULAE } from "../registry";

const SKIP = new Set<string>([
  "index.ts",
  // Domain bundles (imported above)
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
  "lab_interpretation.ts", // ensure full name here
  // Helper cores that might contain shared logic
  "acid_base_core.ts",
]);

function getRegistryIds(): string[] {
  return FORMULAE.map((f) => f.id);
}

export function importAdditionalCalculators() {
  // Webpack/Next.js: discover *.ts files in this folder (non-recursive)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore - require.context is provided by Webpack in Next.js
  const ctx = require.context("./", false, /^\.\/.*\.ts$/);

  const already = new Set(getRegistryIds());
  const ranFiles: string[] = [];
  const newIdsByFile: Record<string, string[]> = {};

  ctx.keys().forEach((k: string) => {
    const file = k.slice(2); // "./foo.ts" -> "foo.ts"
    if (SKIP.has(file)) return;
    if (file.endsWith(".d.ts") || file.endsWith(".test.ts")) return;

    const before = new Set(getRegistryIds());
    ctx(k); // side-effect import -> registers calculators in that file
    ranFiles.push(file);

    const after = new Set(getRegistryIds());
    const added = Array.from(after).filter(
      (id) => !before.has(id) && !already.has(id)
    );
    newIdsByFile[file] = added;
    added.forEach((id) => already.add(id));
  });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[calculators/index] imported", ranFiles.length, "files.");
    Object.entries(newIdsByFile).forEach(([f, ids]) => {
      if (ids.length) {
        // eslint-disable-next-line no-console
        console.log(`  ${f} → registered: ${ids.join(", ")}`);
      }
    });
  }

  return { importedCount: ranFiles.length, ranFiles, newIdsByFile };
}

// Run at module load
importAdditionalCalculators();
