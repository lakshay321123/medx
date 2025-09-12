import { finalizeCalc } from "@/lib/medical/engine/verification/triageFinalizer";
import { FormulaSpecs } from "@/lib/medical/engine/verification/formulaSpecs";
import { calc_anion_gap as anion_gap } from "./anion_gap"; // import others or autoload

type Inputs = Record<string, any>;
type CalcFn = (inputs: Inputs) => number;

const REGISTRY: Record<string, CalcFn> = {
  anion_gap,
  // register more calculators as needed
};

export async function runCalculatorFinal(
  name: string,
  inputs: Inputs,
  opts?: { precision?: number; tolerancePct?: number; strict?: boolean }
) {
  const fn = REGISTRY[name];
  if (!fn) throw new Error(`Calculator not found: ${name}`);

  const localResult = fn(inputs);
  const spec = {
    name,
    formulaSpec: FormulaSpecs[name] ?? name,
    inputs,
    localResult,
    precision: opts?.precision ?? 2,
    tolerancePct: opts?.tolerancePct ?? 1,
    strict: !!opts?.strict,
  };

  return finalizeCalc(spec); // returns CalcVerdict
}
