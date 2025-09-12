// lib/medical/engine/calculators/index.ts
// Barrel for calculator registration. Canonical set must load first.

import "./acid_base_core"; // <<< canonical acid–base + osm calcs (first-wins)

// Add other explicit bundles here if needed (kept empty on purpose).

// Dynamic loader for the rest (skips the barrel & core to avoid double registration)
const modules = import.meta.glob("./*.ts", { eager: true });

const SKIP = new Set<string>([
  "index.ts",
  "acid_base_core.ts",
  // keep any domain-wide bundles you import explicitly above, e.g.:
  // "electrolytes.ts", "acid_base.ts", ...
  "lab_interpretation.ts", // ensure full filename spelled correctly
]);

Object.keys(modules).forEach((k) => {
  // k is like "./foo.ts"
  const file = k.slice(2); // "foo.ts"
  if (SKIP.has(file)) return;
  // importing via Vite's glob with eager=true has already executed side-effects (register calls)
});

