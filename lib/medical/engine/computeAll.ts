import { CalcResult, getRegistry } from "./registry";
import "./calculators";

export function computeAll(ctx: Record<string, any>): CalcResult[] {
  const out: CalcResult[] = [];
  for (const calc of getRegistry()) {
    try {
      const res = calc.run(ctx);
      if (res) out.push(res);
    } catch {
      // ignore individual calculator errors
    }
  }
  return out;
}
