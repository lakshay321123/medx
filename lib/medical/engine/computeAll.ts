import { FORMULAE } from "./registry";
import "./calculators";

export function computeAll(ctx: Record<string, any>) {
  const out: {
    id: string;
    label: string;
    value: any;
    unit?: string;
    precision?: number;
    notes: string[];
  }[] = [];
  for (const f of FORMULAE.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))) {
    try {
      const res = f.run(ctx);
      if (res && res.value != null) {
        out.push({
          id: res.id,
          label: res.label,
          value: res.value,
          unit: res.unit,
          precision: res.precision,
          notes: res.notes ?? [],
        });
      }
    } catch {}
  }
  return out;
}

// === [MEDX_RENDER_STRONG_PRELUDE_START] ===
export function renderResultsBlock(results: { id: string; label: string; value: any; unit?: string; precision?: number; notes?: string[] }[]): string {
  if (!results || !results.length) return "";

  // Split derived/calculated vs raw interpreters
  const derivedOrder = ["anion_gap", "anion_gap_corrected", "winters", "pf_ratio", "map", "shock_index", "meld_na", "child_pugh_helper", "qtc_bazett", "osmolal_gap"];
  const derived = results.filter(r => derivedOrder.includes(r.id));
  const rest = results.filter(r => !derivedOrder.includes(r.id));

  function fmt(r: any): string {
    const v = (typeof r.value === "number" && typeof r.precision === "number")
      ? Number(r.value.toFixed(r.precision))
      : r.value;
    const unit = r.unit ? ` ${r.unit}` : "";
    const notes = r.notes?.length ? ` — ${r.notes.join("; ")}` : "";
    return `• ${r.label}: ${v}${unit}${notes} (pre-computed)`;
  }

  const header = "CLINICAL CALCULATIONS (MUST BE TRUSTED — DO NOT RECALCULATE)";
  const footer = [
    "Use ONLY the above CLINICAL CALCULATIONS as ground truth.",
    "Do not re-compute, invent, or contradict values.",
    "Corrected values (e.g., calcium, anion gap) OVERRIDE raw measurements.",
    "Base all reasoning, differentials, and plans strictly on this block."
  ].join(" ");

  return [header, ...derived.map(fmt), ...rest.map(fmt), footer, ""].join("\n");
}
// === [MEDX_RENDER_STRONG_PRELUDE_END] ===
