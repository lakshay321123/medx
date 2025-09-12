import { finalizeCalc } from "@/lib/medical/engine/verification/triageFinalizer";
import { FormulaSpecs } from "@/lib/medical/engine/verification/formulaSpecs";
import { normalizeInputs } from "@/lib/medical/engine/verification/normalize";
import { validateRequired } from "@/lib/medical/engine/verification/validate";
import { policyFor } from "@/lib/medical/engine/verification/policy";
import * as Calculators from "@/lib/medical/engine/calculators"; // index that re-exports calculators

type Inputs = Record<string, any>;
type CalcFn = (inputs: Inputs) => number;

function resolveCalculator(name: string): CalcFn {
  const fn = (Calculators as any)[name];
  if (!fn) throw new Error(`Calculator not found in registry: ${name}`);
  return fn as CalcFn;
}

export async function runCalcAuthoritative(name: string, rawInputs: Inputs) {
  // 1) normalize key names, strip units out of strings, convert mmol↔mg/dL
  const inputs = normalizeInputs(name, rawInputs);

  // 2) validate required fields (block garbage early)
  const vr = validateRequired(name, inputs);
  if (!vr.ok) {
    return {
      status: "blocked",
      final: 0,
      tier: "local",
      attempts: 0,
      agreeWithLocal: false,
      deltaAbs: NaN,
      deltaPct: NaN,
      reason: `Missing required inputs: ${vr.missing.join(", ")}`,
    };
  }

  // 3) compute local deterministic value
  const fn = resolveCalculator(name);
  const localResult = fn(inputs);

  // 4) policy + spec
  const policy = policyFor(name);
  const formulaSpec = FormulaSpecs[name] ?? name;

  // 5) triage
  const verdict = await finalizeCalc({
    name,
    formulaSpec,
    inputs,
    localResult,
    precision: policy.precision,
    tolerancePct: policy.tolerancePct,
    strict: policy.strict,
    timeoutMs: policy.timeoutMs,
  });

  return verdict;
}
