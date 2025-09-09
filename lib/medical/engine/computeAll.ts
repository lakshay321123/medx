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

  const derivedOrder = [
    "anion_gap", "anion_gap_corrected", "acid_base_summary",
    "pf_ratio", "map", "shock_index", "osmolal_gap",
    "meld_na", "child_pugh_helper", "qtc_bazett",
    // New syndrome summaries:
    "renal_syndrome_summary", "hepatic_syndrome_summary", "circulation_summary",
    "sepsis_risk_summary", "endocrine_keto_hyperglycemia",
    "lactate_status", "hematology_summary"
  ];
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

  const header = "CLINICAL CALCULATIONS & SYNDROME SUMMARIES (MUST BE TRUSTED — DO NOT RECALCULATE)";
  const footer = [
    "Use ONLY the above pre-computed values and syndrome summaries as ground truth.",
    "Do not re-compute, invent, or contradict these values.",
    "Corrected values OVERRIDE raw measurements.",
    "Do not suggest outdated/non-guideline therapies.",
    "Base all reasoning, differentials, and management strictly on this block."
  ].join(" ");

  return [header, ...derived.map(fmt), ...rest.map(fmt), footer, ""].join("\n");
}
// === [MEDX_RENDER_STRONG_PRELUDE_END] ===
