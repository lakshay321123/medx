// lib/medical/engine/calculators/rifle_akin.ts
import { round } from "./utils";

export interface RenalInput {
  creat_current_mg_dL: number;
  creat_baseline_mg_dL: number;
  creat_rise_mg_dL_48h?: number | null;
  rrt_initiated?: boolean | null;
  urine_mL_kg_h_6h?: number | null;
  urine_mL_kg_h_12h?: number | null;
  urine_mL_kg_h_24h?: number | null;
  anuria_hrs_12h?: boolean | null;
}

export function runRIFLE_AKIN(i: RenalInput) {
  const ratio = i.creat_baseline_mg_dL > 0 ? (i.creat_current_mg_dL / i.creat_baseline_mg_dL) : Infinity;
  const delta48 = i.creat_rise_mg_dL_48h ?? 0;
  const u6 = i.urine_mL_kg_h_6h ?? Infinity;
  const u12 = i.urine_mL_kg_h_12h ?? Infinity;
  const u24 = i.urine_mL_kg_h_24h ?? Infinity;

  // AKIN (KDIGO-ish): stage 3 if RRT
  let akin = 0;
  if (i.rrt_initiated) akin = 3;
  else if (ratio >= 3 || (i.creat_current_mg_dL >= 4.0 && (i.creat_baseline_mg_dL > 0))) akin = 3;
  else if (ratio >= 2) akin = 2;
  else if (ratio >= 1.5 || delta48 >= 0.3) akin = 1;

  // Urine outputs can upgrade staging
  if (akin < 3 && (u24 < 0.3 || (i.anuria_hrs_12h ?? false))) akin = 3;
  else if (akin < 2 && u12 < 0.5) akin = 2;
  else if (akin < 1 && u6 < 0.5) akin = 1;

  // RIFLE mapping (Risk, Injury, Failure) using similar thresholds
  let rifle: "None" | "Risk" | "Injury" | "Failure" = "None";
  if (ratio >= 3 || (i.creat_current_mg_dL >= 4.0 && (i.creat_baseline_mg_dL > 0)) || u24 < 0.3 || (i.anuria_hrs_12h ?? false)) rifle = "Failure";
  else if (ratio >= 2 || u12 < 0.5) rifle = "Injury";
  else if (ratio >= 1.5 || u6 < 0.5) rifle = "Risk";

  return { AKIN_stage: akin, RIFLE_class: rifle, creat_ratio: round(ratio, 2), delta48: round(delta48, 2) };
}
