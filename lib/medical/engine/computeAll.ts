import { getAllCalculators } from "./registry";
import type { CalcInputMap, CalcResult } from "./types";

export function computeAll(inputs: CalcInputMap): CalcResult[] {
  const results: CalcResult[] = [];
  for (const calc of getAllCalculators()) {
    const need = calc.inputs;
    const hasAll = need.every(n => !n.required || inputs[n.key] != null);
    if (!hasAll) continue;
    try {
      const r = calc.run(inputs);
      if (r && Number.isFinite(r.value)) {
        if (typeof r.precision === "number") {
          r.value = Number(r.value.toFixed(r.precision));
        }
        results.push(r);
      }
    } catch { /* swallow calc errors */ }
  }
  return results;
}

export function renderResultsBlock(results: CalcResult[]): string {
  if (!results.length) return "";
  const lines = results.map(r => {
    const unit = r.unit ? ` ${r.unit}` : "";
    const notes = r.notes?.length ? ` — ${r.notes.join("; ")}` : "";
    return `• ${r.label}: ${r.value}${unit}${notes}`;
  });
  return [
    "CLINICAL CALCULATIONS",
    ...lines,
    ""
  ].join("\n");
}

