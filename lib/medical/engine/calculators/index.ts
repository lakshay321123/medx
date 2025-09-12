// lib/medical/engine/calculators/index.ts
// Barrel for calculator registration — load canonical set first.

import "./acid_base_core"; // canonical acid–base + osmolality (first-wins)

// Dynamic loader for the rest (avoid double registration of this file and the core)
const modules: Record<string, unknown> =
  (import.meta as any)?.glob?.("./*.ts", { eager: true }) ?? {};

const SKIP = new Set<string>([
  "index.ts",
  "acid_base_core.ts",
  "lab_interpretation.ts", // skip if your lab interpreter self-registers elsewhere
]);

for (const k of Object.keys(modules)) {
  // k looks like "./foo.ts"
  const file = k.startsWith("./") ? k.slice(2) : k;
  if (SKIP.has(file)) continue;
  // Side-effects from eager glob have already executed (register calls).
}

export {};
