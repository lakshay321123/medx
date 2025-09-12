// Registers calculators (side-effect import) and exposes a prelude composer
import { computeAll, renderResultsBlock } from "./computeAll";
import { extractAll, canonicalizeInputs } from "./extract";
import "./calculators";

export function composeCalcPrelude(text: string | undefined | null): string {
  try {
    const t = (text ?? "").toString();
    const inputs = canonicalizeInputs(extractAll(t));
    const results = computeAll(inputs);
    return renderResultsBlock(results);
  } catch {
    return "";
  }
}
