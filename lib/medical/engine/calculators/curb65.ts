import { register } from "../registry";

/**
 * CURB-65 (0–5): Confusion, Urea >7 mmol/L (~BUN>19 mg/dL), RR ≥30, SBP <90 or DBP ≤60, Age ≥65.
 */
export type CURB65Inputs = {
  confusion: boolean;
  bun_mg_dl?: number;    // optional; if provided >19 triggers U component
  urea_mmol_l?: number;  // alternative
  rr_ge30: boolean;
  low_bp: boolean;       // SBP<90 or DBP<=60
  age_ge65: boolean;
};

export function runCURB65(i: CURB65Inputs) {
  if ([i.confusion,i.rr_ge30,i.low_bp,i.age_ge65].some(v => v == null)) return null;
  let u = 0;
  if (typeof i.urea_mmol_l === "number") u = i.urea_mmol_l > 7 ? 1 : 0;
  else if (typeof i.bun_mg_dl === "number") u = i.bun_mg_dl > 19 ? 1 : 0;
  const score = (i.confusion?1:0) + u + (i.rr_ge30?1:0) + (i.low_bp?1:0) + (i.age_ge65?1:0);
  const band = score >= 3 ? "high risk" : score === 2 ? "intermediate" : "low";
  return { score, band };
}

register({
  id: "curb65",
  label: "CURB-65",
  inputs: [
    { key: "confusion", required: true },
    { key: "bun_mg_dl" },
    { key: "urea_mmol_l" },
    { key: "rr_ge30", required: true },
    { key: "low_bp", required: true },
    { key: "age_ge65", required: true },
  ],
  run: (ctx) => {
    const r = runCURB65(ctx as CURB65Inputs);
    if (!r) return null;
    return { id: "curb65", label: "CURB-65", value: r.score, unit: "points", notes: [r.band], precision: 0 };
  },
});
