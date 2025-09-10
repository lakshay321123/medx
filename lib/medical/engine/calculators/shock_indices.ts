import { round } from "./utils";

export interface ShockInput {
  hr_bpm: number;
  sbp_mmHg: number;
  dbp_mmHg?: number;
  age_years?: number;
}

export interface ShockOutput {
  shock_index: number; // HR / SBP
  diastolic_shock_index?: number; // HR / DBP
  age_shock_index?: number; // Age * SI (commonly used proxy)
  bands: {
    shock_index: "low" | "normal" | "high";
    diastolic_shock_index?: "normal" | "high";
  };
  notes?: string[];
}

export function runShockIndices(i: ShockInput): ShockOutput {
  const si = i.sbp_mmHg > 0 ? i.hr_bpm / i.sbp_mmHg : NaN;
  const dsi = i.dbp_mmHg && i.dbp_mmHg > 0 ? i.hr_bpm / i.dbp_mmHg : undefined;
  const asi = i.age_years ? (isFinite(si) ? i.age_years * si : undefined) : undefined;

  let siBand: "low" | "normal" | "high" = "normal";
  if (isFinite(si)) {
    if (si >= 0.9) siBand = "high";
    else if (si < 0.5) siBand = "low";
  }

  const out: ShockOutput = {
    shock_index: round(si, 2),
    diastolic_shock_index: dsi !== undefined ? round(dsi, 2) : undefined,
    age_shock_index: asi !== undefined ? round(asi, 2) : undefined,
    bands: { shock_index: siBand, diastolic_shock_index: dsi !== undefined ? (dsi >= 1.4 ? "high" : "normal") : undefined },
    notes: ["Use in context; not specific."]
  };
  return out;
}
