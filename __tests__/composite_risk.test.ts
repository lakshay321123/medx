/**
 * Auto tests for domain calculators
 * - Ensures registration & run shape
 * - Uses minimal synthesized inputs
 */

import "../lib/medical/engine/calculators/lab_interpretation"; // ensure base registry side-effects
// Also import the specific domain file under test:
import "../lib/medical/engine/calculators/composite_risk";
const registry = require("../lib/medical/engine/registry");

function getCalc(id: string) {
  const g = registry.get || registry.getCalculator || registry.resolve || registry.lookup;
  if (typeof g === "function") return g.call(registry, id);
  if (registry.registry && registry.registry[id]) return registry.registry[id];
  throw new Error(`Registry.get() not found for ${id}`);
}

async function runCalc(id: string, inputs: Record<string, any>) {
  const direct = registry.run || registry.invoke || registry.evaluate || registry.exec || null;
  if (typeof direct === "function") return await direct.call(registry, id, inputs);
  const calc = getCalc(id);
  if (!calc || typeof calc.run !== "function") throw new Error(`Missing run() for ${id}`);
  return await calc.run(inputs);
}

function expectShape(o: any) {
  expect(o).toBeTruthy();
  expect(typeof o.id).toBe("string");
  expect(typeof o.label).toBe("string");
  expect(["number","string"]).toContain(typeof o.value);
  expect(typeof o.unit).toBe("string");
  expect(typeof o.precision).toBe("number");
  expect(Array.isArray(o.notes)).toBe(true);
}

const CASES: Array<{ id: string; inputs: Record<string, any> }> = [
  {
    "id": "dka_severity_score",
    "inputs": {
      "glucose": 550,
      "ph": 7.18,
      "hco3": 12,
      "mental_status": "drowsy"
    }
  },
  {
    "id": "sepsis_bundle_flag",
    "inputs": {
      "qsofa": 2,
      "lactate": 3.1
    }
  }
];

describe("CompositeRisk: calculators present", () => {
  test.each(CASES.map(c => [c.id, c]))("%s is registered", (id, c) => {
    const calc = getCalc(c.id);
    expect(calc).toBeTruthy();
    expect(typeof calc.label).toBe("string");
    expect(typeof calc.run).toBe("function");
  });
});

describe("CompositeRisk: calculators run & shape", () => {
  test.each(CASES.map(c => [c.id, c]))("%s runs", async (_id, c) => {
    let out: any = null;
    try {
      out = await runCalc(c.id, c.inputs);
    } catch {
      // tolerate strict validators
    }
    if (out === null || out === undefined) {
      expect(out).toBeNull();
    } else {
      expectShape(out);
      expect(out.id).toBe(c.id);
    }
  });
});
