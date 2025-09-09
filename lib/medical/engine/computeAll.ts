import { FORMULAE } from "./registry";
import "./calculators";

export function computeAll(ctx: Record<string, any>) {
  const out: { id: string; label: string; value: any; unit?: string; notes: string[] }[] = [];
  for (const f of FORMULAE.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))) {
    try {
      const res = f.run(ctx);
      if (res && res.value != null) {
        const v = (typeof res.value === "number" && typeof res.precision === "number")
          ? Number(res.value.toFixed(res.precision))
          : res.value;
        out.push({ id: res.id, label: res.label, value: v, unit: res.unit, notes: res.notes ?? [] });
      }
    } catch {}
  }
  return out;
}

export function renderResultsBlock(results: { id: string; label: string; value: any; unit?: string; notes?: string[] }[]): string {
  if (!results.length) return "";
  const lines = results.map(r => {
    const val = r.unit ? `${r.value} ${r.unit}` : String(r.value);
    const notes = r.notes && r.notes.length ? ` — ${r.notes.join("; ")}` : "";
    return `${r.label}: ${val}${notes}`;
  });
  return lines.join("\n");
}
