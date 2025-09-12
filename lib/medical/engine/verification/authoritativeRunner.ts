import { finalizeCalc } from "@/lib/medical/engine/verification/triageFinalizer";
import { FormulaSpecs } from "@/lib/medical/engine/verification/formulaSpecs";
import { normalizeInputs } from "@/lib/medical/engine/verification/normalize";
import { policyFor } from "@/lib/medical/engine/verification/policy";
import * as Calculators from "@/lib/medical/engine/calculators"; // your index that re-exports calculators

type Inputs = Record<string, any>;
type CalcFn = (inputs: Inputs) => number;

function resolveCalculator(name: string): CalcFn {
  const fn = (Calculators as any)[name];
  if (!fn) throw new Error(`Calculator not found in registry: ${name}`);
  return fn as CalcFn;
}

export async function runCalcAuthoritative(name: string, rawInputs: Inputs) {
  const inputs = normalizeInputs(name, rawInputs);
  const fn = resolveCalculator(name);
  const localResult = fn(inputs);
  const policy = policyFor(name);
  const formulaSpec = FormulaSpecs[name] ?? name;

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
