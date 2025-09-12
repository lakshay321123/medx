import { finalizeCalc } from "./triageFinalizer";
import { FormulaSpecs } from "./formulaSpecs";
import { normalizeInputs } from "./normalize";
import { policyFor } from "./policy";

// IMPORTANT: use your existing calculators loader/registry here.
// Option A (preferred): import your central registry that already imports all calculators:
import * as Calculators from "../calculators"; // if this exports named calculators

export async function runCalcAuthoritative(name: string, rawInputs: Record<string, any>) {
  // 1) Normalize inputs (units, NaNs, strings)
  const inputs = normalizeInputs(name, rawInputs);

  // 2) Compute local deterministic result
  const fn = (Calculators as any)[name];
  if (typeof fn !== "function") throw new Error(`Calculator not found in registry: ${name}`);
  const localResult = fn(inputs);

  // 3) Get policy + formula spec
  const policy = policyFor(name);
  const formulaSpec = FormulaSpecs[name] ?? name;

  // 4) Triage
  return finalizeCalc({
    name,
    formulaSpec,
    inputs,
    localResult,
    precision: policy.precision,
    tolerancePct: policy.tolerancePct,
    strict: policy.strict,
    timeoutMs: policy.timeoutMs,
  });
}
