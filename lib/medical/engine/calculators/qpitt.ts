// lib/medical/engine/calculators/qpitt.ts
// quick Pitt bacteremia score (qPitt): 1 point each (0–5).
// Items: temperature <36 C, SBP <90 mmHg, mechanical ventilation, cardiac arrest, altered mental status.

export interface qPittInput {
  temp_c_lt_36?: boolean | null;
  sbp_lt_90?: boolean | null;
  mech_vent?: boolean | null;
  cardiac_arrest?: boolean | null;
  altered_mental_status?: boolean | null;
}

export interface qPittOutput {
  points: number;
  risk_band: "low" | "moderate" | "high";
  flags: {
    temp_c_lt_36: boolean;
    sbp_lt_90: boolean;
    mech_vent: boolean;
    cardiac_arrest: boolean;
    altered_mental_status: boolean;
  };
}

export function runqPitt(i: qPittInput): qPittOutput {
  const t = !!i.temp_c_lt_36;
  const b = !!i.sbp_lt_90;
  const v = !!i.mech_vent;
  const ca = !!i.cardiac_arrest;
  const ams = !!i.altered_mental_status;

  const points = (t?1:0)+(b?1:0)+(v?1:0)+(ca?1:0)+(ams?1:0);
  let band: "low"|"moderate"|"high" = "low";
  if (points >= 4) band = "high";
  else if (points >= 2) band = "moderate";
  return { points, risk_band: band, flags: { temp_c_lt_36: t, sbp_lt_90: b, mech_vent: v, cardiac_arrest: ca, altered_mental_status: ams } };
}
