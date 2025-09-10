
import { register } from "../registry";
export interface SCORADInput { extent_pct: number; intensity_sum: number; subjective_sum: number; }
export interface SCORADResult { scorad: number; band: "mild" | "moderate" | "severe"; }
export function runSCORAD(i: SCORADInput): SCORADResult {
  const s = i.extent_pct/5 + 7*i.intensity_sum/2 + i.subjective_sum;
  let band: "mild"|"moderate"|"severe" = "mild";
  if (s >= 25 && s <= 50) band = "moderate"; else if (s > 50) band = "severe";
  return { scorad: Number(s.toFixed(1)), band };
}
register({
  id: "scorad",
  label: "SCORAD",
  inputs: [{ key: "extent_pct", required: true }, { key: "intensity_sum", required: true }, { key: "subjective_sum", required: true }],
  run: ({ extent_pct, intensity_sum, subjective_sum }) => {
    if (extent_pct == null || intensity_sum == null || subjective_sum == null) return null;
    const r = runSCORAD({ extent_pct, intensity_sum, subjective_sum });
    return { id: "scorad", label: "SCORAD", value: r.scorad, notes: [r.band], precision: 1 };
  },
});
