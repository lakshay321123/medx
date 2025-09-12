import { finalizeWithOpenAI } from "../verification/openaiFinalizer";
import { FormulaSpecs } from "../verification/formulaSpecs";

type AnyInputs = Record<string, any>;
type CalculatorFn = (inputs: AnyInputs) => number;

const registry: Record<string, CalculatorFn> = {
  // Example mapping; extend with other calculators as needed
  anion_gap: ({ Na, Cl, HCO3 }) =>
    require("./anion_gap").calc_anion_gap({
      na_mmol_l: Na,
      cl_mmol_l: Cl,
      hco3_mmol_l: HCO3,
    }),
};

export async function runCalculatorFinal(
  name: string,
  inputs: AnyInputs,
  opts?: { units?: string; precision?: number; tolerancePct?: number }
) {
  const fn = registry[name];
  if (!fn) throw new Error(`Calculator not found: ${name}`);
  const localResult = fn(inputs);
  const formulaSpec = FormulaSpecs[name] ?? name; // fallback to name if spec missing

  const verification = await finalizeWithOpenAI({
    calculator: name,
    formulaSpec,
    inputs,
    localResult,
    units: opts?.units,
    precision: opts?.precision,
    tolerancePct: opts?.tolerancePct,
  });

  if (!verification.pass) {
    console.warn(
      `[Finalizer] Disagreement for ${name}: local=${localResult} ai=${verification.final} Δ=${verification.deltaAbs} (${verification.deltaPct.toFixed(
        2
      )}%)`
    );
  }

  return {
    value: verification.final,
    explain: verification.explanation,
    local: localResult,
    agreeWithLocal: verification.agreeWithLocal,
    deltaPct: verification.deltaPct,
  };
}
