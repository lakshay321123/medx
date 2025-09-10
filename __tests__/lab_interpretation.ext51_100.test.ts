/**
 * Jest: EXT51–100 calculator coverage
 *
 * This file is manifest-driven: add each calculator's ID from EXT51–100
 * to the CASES array below with a minimal happy-path input and (optionally)
 * expected note/band keywords. The harness will:
 *  - ensure the calculator is registered,
 *  - invoke it with your inputs,
 *  - validate output shape: {id,label,value,unit,precision,notes[]},
 *  - sanity-check notes for expected bands when provided.
 *
 * Append-only. Keep this file small & focused to make failures easy to triage.
 */

import path from "path";

// Ensure all calculators are registered via side-effects of the calculators module.
import "../lib/medical/engine/calculators/lab_interpretation";

const registryMod = require("../lib/medical/engine/registry");

// ---- Harness that adapts to your registry's API surface ----
function getCalc(id: string) {
  const g = registryMod.get || registryMod.getCalculator || registryMod.resolve || registryMod.lookup;
  if (typeof g === "function") return g.call(registryMod, id);
  // Fallback: some registries expose a map
  if (registryMod.registry && registryMod.registry[id]) return registryMod.registry[id];
  throw new Error(`Registry.get() not found; please expose get(id) or registry map. Missing calculator: ${id}`);
}

async function runCalc(id: string, inputs: Record<string, any>) {
  // Prefer a direct run/invoke API if present
  const direct =
    registryMod.run ||
    registryMod.invoke ||
    registryMod.evaluate ||
    registryMod.exec ||
    null;

  if (typeof direct === "function") {
    return await direct.call(registryMod, id, inputs);
  }
  // Otherwise call the calculator's run handler
  const calc = getCalc(id);
  if (!calc || typeof calc.run !== "function") {
    throw new Error(`Calculator '${id}' not found or missing run()`);
  }
  return await calc.run(inputs);
}

function expectShape(o: any) {
  expect(o).toBeTruthy();
  expect(typeof o.id).toBe("string");
  expect(typeof o.label).toBe("string");
  // value can be number or string (some flags return 0/1, some ratio/grade)
  expect(["number", "string"]).toContain(typeof o.value);
  expect(typeof o.unit).toBe("string");
  expect(typeof o.precision).toBe("number");
  expect(Array.isArray(o.notes)).toBe(true);
}

// --------- Manifest: add EXT51–100 calculators here ---------
// For each entry: { id, inputs, expectNotes?: ["keyword", ...] }
const CASES: Array<{
  id: string;
  inputs: Record<string, any>;
  expectNotes?: string[];
}> = [
  // 🔧 TODO: Fill this list with your EXT51–100 IDs + minimal good inputs.
  // Examples below are templates; replace with your actual calculators:

  // { id: "example_anion_gap", inputs: { Na: 140, Cl: 105, HCO3: 22 }, expectNotes: [] },
  // { id: "corrected_calcium", inputs: { serum_ca_mg_dl: 7.8, albumin_g_dl: 2.5 }, expectNotes: ["low","normal","high"] },
  // { id: "gfr_ckd_epi_surrogate", inputs: { eGFR: 42 }, expectNotes: ["stage"] },

  // Note: Leave at least one real case before committing, otherwise the suite will skip.
];

// ------------------- Test suite -------------------

describe("EXT51–100: registration loads without throwing", () => {
  test("calculators module loads", () => {
    // If imports above succeed, registration side-effects ran.
    expect(true).toBe(true);
  });
});

(CASES.length ? describe : describe.skip)("EXT51–100: calculators run & shape", () => {
  test.each(CASES.map(c => [c.id, c]))("%s runs and returns proper shape", async (_label, c) => {
    const out = await runCalc(c.id, c.inputs);
    expectShape(out);

    // ID and label sanity
    expect(out.id).toBe(c.id);
    expect(out.label.length).toBeGreaterThan(0);

    // Precision should be a small integer (0–3 is typical across repo)
    expect(out.precision).toBeGreaterThanOrEqual(0);
    expect(out.precision).toBeLessThanOrEqual(4);

    // Notes sanity (strings, concise)
    for (const n of out.notes) {
      expect(typeof n).toBe("string");
      expect(n.length).toBeLessThanOrEqual(80);
    }

    // Optional band/keyword expectations: at least one match if provided
    if (c.expectNotes && c.expectNotes.length) {
      const joined = out.notes.join(" ").toLowerCase();
      const matched = c.expectNotes.some(k => joined.includes(k.toLowerCase()));
      expect(matched).toBe(true);
    }
  });
});

(CASES.length ? describe : describe.skip)("EXT51–100: minimal content semantics", () => {
  test.each(CASES.map(c => [c.id, c]))("%s value is finite or a non-empty string", async (_label, c) => {
    const out = await runCalc(c.id, c.inputs);
    if (typeof out.value === "number") {
      expect(Number.isFinite(out.value)).toBe(true);
    } else {
      expect(out.value).toEqual(expect.any(String));
      expect(out.value.length).toBeGreaterThan(0);
    }
  });
});

// Helpful hint when the manifest is empty
if (CASES.length === 0) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Jest EXT51–100] CASES manifest is empty. Add calculator IDs and inputs to enable this suite."
  );
}
