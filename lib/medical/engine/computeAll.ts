// lib/medical/engine/computeAll.ts
import { FORMULAE } from "./registry";
import "./calculators"; // auto-resolves to calculators/index.ts

export function computeAll(ctx: Record<string, any>) {
  const out: { id: string; label: string; value: any; unit?: string; notes: string[] }[] = [];

  for (const f of FORMULAE.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))) {
    try {
      const res = f.run(ctx);
      if (res && res.value != null) {
        const v =
          typeof res.value === "number" && res.precision != null
            ? Number(res.value.toFixed(res.precision))
            : res.value;

        out.push({
          id: res.id,
          label: res.label,
          value: v,
          unit: res.unit,
          notes: res.notes ?? [],
        });
      }
    } catch {
      // ignore per-formula errors
    }
  }

  return out;
}
