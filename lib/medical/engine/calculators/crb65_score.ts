import { register } from "../registry";

/**
 * CRB-65 for community-acquired pneumonia severity (0–4).
 * Confusion, Respiratory rate ≥30, low Blood pressure (SBP <90 or DBP ≤60), Age ≥65.
 */
export type CRB65Inputs = {
  confusion: boolean;
  rr_ge30: boolean;
  low_bp: boolean; // SBP <90 or DBP <=60
  age_ge65: boolean;
};

export function runCRB65(i: CRB65Inputs) {
  if ([i.confusion,i.rr_ge30,i.low_bp,i.age_ge65].some(v => v == null)) return null;
  const score = [i.confusion, i.rr_ge30, i.low_bp, i.age_ge65].filter(Boolean).length;
  const band = score >= 3 ? "high risk" : score === 2 ? "intermediate" : "low";
  return { score, band };
}

register({
  id: "crb65",
  label: "CRB-65",
  inputs: [
    { key: "confusion", required: true },
    { key: "rr_ge30", required: true },
    { key: "low_bp", required: true },
    { key: "age_ge65", required: true },
  ],
  run: (ctx: any) => {
    const r = runCRB65(ctx as CRB65Inputs);
    if (!r) return null;
    return { id: "crb65", label: "CRB-65", value: r.score, unit: "points", notes: [r.band], precision: 0 };
  },
});
