// lib/medical/engine/calculators/gap_ipf.ts
import { round } from "./utils";

export interface GAPInput {
  male: boolean;
  age_years: number;
  fvc_pct_pred: number;
  dlco_pct_pred?: number | null;  // if absent, can mark as "cannot perform" via dlco_cannot_perform
  dlco_cannot_perform?: boolean | null;
}

export function runGAP(i: GAPInput) {
  let pts = 0;
  // Gender
  pts += i.male ? 1 : 0;
  // Age
  pts += (i.age_years > 65) ? 2 : (i.age_years >= 61 ? 1 : 0);
  // FVC % predicted
  pts += (i.fvc_pct_pred < 50) ? 2 : (i.fvc_pct_pred < 75 ? 1 : 0);
  // DLCO
  if (i.dlco_cannot_perform) pts += 3;
  else if (typeof i.dlco_pct_pred === "number") {
    pts += (i.dlco_pct_pred <= 35) ? 2 : (i.dlco_pct_pred <= 55 ? 1 : 0);
  }

  let stage: 1|2|3 = 1;
  if (pts >= 6) stage = 3;
  else if (pts >= 4) stage = 2;

  return { gap_points: pts, stage };
}
