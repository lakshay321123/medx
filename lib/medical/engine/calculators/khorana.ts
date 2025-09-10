// lib/medical/engine/calculators/khorana.ts
import { round } from "./utils";

/** Sites: very high (2): stomach, pancreas; high (1): lung, lymphoma, gynecologic, bladder, testicular */
export type CancerSite =
  | "stomach" | "pancreas"
  | "lung" | "lymphoma" | "gynecologic" | "bladder" | "testicular"
  | "other";

export interface KhoranaInput {
  site: CancerSite;
  platelets_x10e9_L: number;
  hemoglobin_g_dL: number;
  on_erythropoiesis_stim_agents: boolean;
  leukocytes_x10e9_L: number;
  bmi_kg_m2: number;
}

export function runKhorana(i: KhoranaInput) {
  let pts = 0;
  pts += (i.site === "stomach" || i.site === "pancreas") ? 2 :
         (["lung","lymphoma","gynecologic","bladder","testicular"].includes(i.site) ? 1 : 0);
  pts += i.platelets_x10e9_L >= 350 ? 1 : 0;
  pts += (i.hemoglobin_g_dL < 10 || i.on_erythropoiesis_stim_agents) ? 1 : 0;
  pts += i.leukocytes_x10e9_L > 11 ? 1 : 0;
  pts += i.bmi_kg_m2 >= 35 ? 1 : 0;

  let band: "low"|"intermediate"|"high" = "low";
  if (pts >= 3) band = "high";
  else if (pts == 2) band = "intermediate";
  return { khorana_points: pts, risk_band: band };
}
