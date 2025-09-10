import { round } from "./utils";

export interface RenalInput {
  creat_baseline_mg_dL: number;
  creat_current_mg_dL: number;
  urine_mL_kg_h_6h?: number;
  urine_mL_kg_h_12h?: number;
  rrt_initiated?: boolean;
}

export type Stage = "none" | "risk" | "injury" | "failure" | "loss" | "esrd";
export type AKIN = 0 | 1 | 2 | 3;

export function runRIFLE(i: RenalInput) {
  if (i.rrt_initiated) return { stage: "failure" as Stage, reason: "RRT initiated → at least Failure" };
  const ratio = i.creat_baseline_mg_dL > 0 ? i.creat_current_mg_dL / i.creat_baseline_mg_dL : NaN;
  let stage: Stage = "none";
  if (isFinite(ratio)) {
    if (ratio >= 3 || i.creat_current_mg_dL >= 4.0) stage = "failure";
    else if (ratio >= 2) stage = "injury";
    else if (ratio >= 1.5) stage = "risk";
  }
  const u12 = i.urine_mL_kg_h_12h;
  if (u12 !== undefined) {
    if (u12 < 0.3) stage = ["none","risk","injury","failure"].includes(stage) ? "failure" : stage;
  }
  return { stage, ratio: round(ratio,2) };
}

export function runAKIN(i: RenalInput) {
  if (i.rrt_initiated) return { stage: 3 as AKIN, reason: "RRT initiated" };
  const delta = i.creat_current_mg_dL - i.creat_baseline_mg_dL;
  const ratio = i.creat_baseline_mg_dL > 0 ? i.creat_current_mg_dL / i.creat_baseline_mg_dL : NaN;
  let stage: AKIN = 0;
  if (isFinite(delta) && isFinite(ratio)) {
    if (delta >= 0.3 || ratio >= 1.5) stage = 1;
    if (ratio >= 2.0) stage = 2;
    if (ratio >= 3.0 || i.creat_current_mg_dL >= 4.0) stage = 3;
  }
  const u6 = i.urine_mL_kg_h_6h;
  if (u6 !== undefined && u6 < 0.5) stage = Math.max(stage, 1) as AKIN;
  return { stage, delta: round(delta,2), ratio: round(ratio,2) };
}
