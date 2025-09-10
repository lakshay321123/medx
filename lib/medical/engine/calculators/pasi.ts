
import { register } from "../registry";
export interface RegionInput { area_pct: number; erythema: number; induration: number; desquamation: number; }
export interface PASIInput { head: RegionInput; upper: RegionInput; trunk: RegionInput; lower: RegionInput; }
export interface PASIResult { pasi: number; }
function areaScore(pct: number) {
  if (pct === 0) return 0; if (pct < 10) return 1; if (pct < 30) return 2; if (pct < 50) return 3; if (pct < 70) return 4; if (pct < 90) return 5; return 6;
}
function regionScore(r: RegionInput) {
  const sevSum = r.erythema + r.induration + r.desquamation;
  return sevSum * areaScore(r.area_pct);
}
export function runPASI(i: PASIInput): PASIResult {
  const w = { head: 0.1, upper: 0.2, trunk: 0.3, lower: 0.4 };
  const total = w.head * regionScore(i.head) + w.upper * regionScore(i.upper) + w.trunk * regionScore(i.trunk) + w.lower * regionScore(i.lower);
  return { pasi: Number(total.toFixed(2)) };
}
register({
  id: "pasi",
  label: "PASI (simplified)",
  inputs: [{ key: "head", required: true }, { key: "upper", required: true }, { key: "trunk", required: true }, { key: "lower", required: true }],
  run: ({ head, upper, trunk, lower }) => {
    if (!head || !upper || !trunk || !lower) return null;
    const r = runPASI({ head, upper, trunk, lower });
    return { id: "pasi", label: "PASI", value: r.pasi, precision: 2, notes: [] };
  },
});
