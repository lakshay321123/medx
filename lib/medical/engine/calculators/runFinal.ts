import { finalizeCalc } from "@/lib/medical/engine/verification/triageFinalizer";
import { FormulaSpecs } from "@/lib/medical/engine/verification/formulaSpecs";

// Import your existing calculator functions:
import { calc_anion_gap } from "./anion_gap";
// import additional calculators or build a registry programmatically

type Inputs = Record<string, any>;
type CalcFn = (inputs: Inputs) => number;

const REGISTRY: Record<string, CalcFn> = {
  anion_gap: calc_anion_gap,
  // populate the rest or autoload
};

export async function runCalculatorFinal(
  name: string,
  inputs: Inputs,
  precision = 2
) {
  const fn = REGISTRY[name];
  if (!fn) throw new Error(`Calculator not found: ${name}`);
  const localResult = fn(inputs);
  const formulaSpec = FormulaSpecs[name] ?? name;

  const verdict = await finalizeCalc({
    name,
    formulaSpec,
    inputs,
    localResult,
    precision,
  });

  // Optional telemetry
  if (verdict.tier !== "openai") {
    console.warn(`[calc-finalizer] ${name}: tier=${verdict.tier} local=${localResult} final=${verdict.final}`);
  }
  return verdict; // { final, tier, explanation }
}
