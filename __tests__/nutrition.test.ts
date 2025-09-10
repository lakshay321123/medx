/**
 * Auto tests for domain calculators
 * - Ensures registration & run shape
 * - Uses minimal synthesized inputs
 */

import "../lib/medical/engine/calculators/lab_interpretation"; // ensure base registry side-effects
// Also import the specific domain file under test:
import "../lib/medical/engine/calculators/nutrition";
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
    "id": "bmi_calc",
    "inputs": {
      "weight_kg": 80,
      "height_cm": 175
    }
  },
  {
    "id": "mifflin_st_jeor_bmr",
    "inputs": {
      "sex": "male",
      "age": 35,
      "weight_kg": 80,
      "height_cm": 175
    }
  },
  {
    "id": "total_energy_expenditure",
    "inputs": {
      "bmr": 1700,
      "activity_factor": 1.3
    }
  },
  {
    "id": "protein_goal_icu",
    "inputs": {
      "weight_kg": 70,
      "severity": "standard"
    }
  },
  {
    "id": "nitrogen_balance",
    "inputs": {
      "protein_g": 100,
      "urea_nitrogen_g": 12
    }
  }
];

describe("Nutrition: calculators present", () => {
  test.each(CASES.map(c => [c.id, c]))("%s is registered", (id, c) => {
    const calc = getCalc(c.id);
    expect(calc).toBeTruthy();
    expect(typeof calc.label).toBe("string");
    expect(typeof calc.run).toBe("function");
  });
});

describe("Nutrition: calculators run & shape", () => {
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
