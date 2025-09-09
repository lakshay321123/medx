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
  const lines = results.map(r => {
    const v = (typeof r.value === "number" && typeof r.precision === "number")
      ? Number(r.value.toFixed(r.precision))
      : r.value;
    const unit = r.unit ? ` ${r.unit}` : "";
    const notes = r.notes?.length ? ` — ${r.notes.join("; ")}` : "";
    return `• ${r.label}: ${v}${unit}${notes}`;
  });

  const header = "CLINICAL CALCULATIONS (MUST BE TRUSTED — DO NOT RECALCULATE)";
  const footer = "Use the above CLINICAL CALCULATIONS as ground truth. Do not recompute or contradict them. Base all interpretation and plan on these values.";

  return [header, ...lines, footer, ""].join("\n");
}
// === [MEDX_RENDER_STRONG_PRELUDE_END] ===
