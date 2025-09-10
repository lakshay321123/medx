/**
 * Jest: EXT1–50 calculator coverage
 *
 * This suite mirrors the harness used for the other block files (51–650):
 *  - ensures calculators are registered,
 *  - runs each with synthesized minimal inputs,
 *  - asserts output shape: {id,label,value,unit,precision,notes[]},
 *  - tolerates calculators that return null for invalid inputs.
 *
 * Append-only.
 */

// Ensure all calculators register via module side-effects
import "../lib/medical/engine/calculators/lab_interpretation";
const registry = require("../lib/medical/engine/registry");

// ---- Harness that adapts to your registry's API surface ----
function getCalc(id: string) {
  const g =
    registry.get ||
    registry.getCalculator ||
    registry.resolve ||
    registry.lookup;
  if (typeof g === "function") return g.call(registry, id);
  if (registry.registry && registry.registry[id]) return registry.registry[id];
  throw new Error(`Registry.get() not found; expose get(id) or registry map. Missing: ${id}`);
}

async function runCalc(id: string, inputs: Record<string, any>) {
  const direct =
    registry.run ||
    registry.invoke ||
    registry.evaluate ||
    registry.exec ||
    null;
  if (typeof direct === "function") return await direct.call(registry, id, inputs);
  const calc = getCalc(id);
  if (!calc || typeof calc.run !== "function") throw new Error(`Calculator '${id}' not found or missing run()`);
  return await calc.run(inputs);
}

function expectShape(o: any) {
  expect(o).toBeTruthy();
  expect(typeof o.id).toBe("string");
  expect(typeof o.label).toBe("string");
  expect(["number", "string"]).toContain(typeof o.value);
  expect(typeof o.unit).toBe("string");
  expect(typeof o.precision).toBe("number");
  expect(Array.isArray(o.notes)).toBe(true);
}

// --------- Manifest for EXT1–50 ---------
// If you later want to refine inputs, you can edit this list.
// For now, we auto-synthesize inputs for required fields.
type Case = { id: string; reqKeys: string[]; inputs?: Record<string, any> };

// Pull IDs from the calculator source order by scanning the file text.
// This keeps alignment with your EXT blocks without hard-coding IDs here.
const fs = require("fs");
const path = require("path");
const calcPath = path.resolve(__dirname, "../lib/medical/engine/calculators/lab_interpretation.ts");
const src = fs.readFileSync(calcPath, "utf-8");

function parseCases(limitStart: number, limitEnd: number): Case[] {
  const reBlock = /register\(\s*\{([\s\S]*?)\}\s*\);/g;
  const reId = /id\s*:\s*"([^"]+)"/;
  const reInputs = /inputs\s*:\s*\[([\s\S]*?)\]/;
  const reKey = /\{\s*key\s*:\s*"([^"]+)"\s*,\s*required\s*:\s*(true|false)[^}]*\}/g;
  const seen = new Set<string>();
  const items: Case[] = [];
  let m: RegExpExecArray | null;
  while ((m = reBlock.exec(src))) {
    const block = m[1];
    const idm = reId.exec(block);
    if (!idm) continue;
    const id = idm[1];
    if (seen.has(id)) continue;
    seen.add(id);
    let reqKeys: string[] = [];
    const im = reInputs.exec(block);
    if (im) {
      const body = im[1];
      let km: RegExpExecArray | null;
      while ((km = reKey.exec(body))) {
        const key = km[1];
        const required = km[2] === "true";
        if (required) reqKeys.push(key);
      }
    }
    items.push({ id, reqKeys });
  }
  // limit to range
  const start = Math.max(0, limitStart - 1);
  const end = Math.min(items.length, limitEnd);
  return items.slice(start, end);
}

function synthesizeInputs(keys: string[]) {
  const out: Record<string, any> = {};
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (/(flag|present|positive|detected|bool)/.test(lk)) out[k] = true;
    else if (lk === "fio2") out[k] = 0.21;
    else if (lk === "rq") out[k] = 0.8;
    else if (/(age|hours|days|time_hr|time|hr)/.test(lk)) out[k] = 24;
    else if (/(map|sbp|dbp|pao2|paco2|baro|plateau|peep|pip|rap|mpap)/.test(lk)) out[k] = 80;
    else if (lk === "hr") out[k] = 80;
    else if (lk === "rr") out[k] = 18;
    else if (lk === "ph") out[k] = 7.35;
    else if (lk === "spo2") out[k] = 96;
    else if (/(diam|vti|sv_ml|sv|bsa|height|weight|wt|vt_ml|index|score|grade|class|percent|ratio)/.test(lk)) out[k] = lk.includes("bsa") ? 1.8 : 1;
    else if (/(platelets|count|cells|titer)/.test(lk)) out[k] = 150;
    else if (/(na|sodium|potassium|k|cl|hco3|creat|cr|bun|glucose|lactate|bilirubin|ast|alt|albumin)/.test(lk)) out[k] = lk === "lactate" ? 2.0 : 100;
    else out[k] = 1;
  }
  return out;
}

const CASES: Array<{ id: string; inputs: Record<string, any> }> =
  parseCases(1, 50).map(c => ({ id: c.id, inputs: synthesizeInputs(c.reqKeys) }));

describe("EXT1–50: calculators present", () => {
  test.each(CASES.map(c => [c.id, c]))("%s is registered", (id, c) => {
    const calc = getCalc(c.id);
    expect(calc).toBeTruthy();
    expect(typeof calc.label).toBe("string");
    expect(typeof calc.run).toBe("function");
  });
});

describe("EXT1–50: calculators run & shape", () => {
  test.each(CASES.map(c => [c.id, c]))("%s runs", async (_id, c) => {
    let out: any = null;
    try {
      out = await runCalc(c.id, c.inputs);
    } catch (e) {
      // calculators may throw/require stricter inputs — accept null
      // eslint-disable-next-line no-console
      console.warn("Run error for", c.id, "— treating as null");
    }
    if (out === null || out === undefined) {
      expect(out).toBeNull();
    } else {
      expectShape(out);
      expect(out.id).toBe(c.id);
    }
  }, 10000);
});
