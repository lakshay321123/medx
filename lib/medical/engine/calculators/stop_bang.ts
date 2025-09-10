// lib/medical/engine/calculators/stop_bang.ts
import { round } from "./utils";

export interface StopBangInput {
  snoring_loud?: boolean;
  tired_daytime?: boolean;
  observed_apnea?: boolean;
  high_bp_history?: boolean;
  bmi_kg_m2?: number;
  age_years?: number;
  neck_circumference_cm?: number;
  male?: boolean;
}

export function runSTOPBANG(i: StopBangInput) {
  let pts = 0;
  const add = (b?: boolean) => { if (b) pts += 1; };

  add(i.snoring_loud);
  add(i.tired_daytime);
  add(i.observed_apnea);
  add(i.high_bp_history);
  if (typeof i.bmi_kg_m2 === "number" && i.bmi_kg_m2 >= 35) pts += 1;
  if (typeof i.age_years === "number" && i.age_years > 50) pts += 1;
  if (typeof i.neck_circumference_cm === "number" && i.neck_circumference_cm > 40) pts += 1;
  add(i.male);

  let risk: "low"|"intermediate"|"high" = "low";
  if (pts >= 5) risk = "high";
  else if (pts >= 3) risk = "intermediate";

  return { stopbang_points: pts, risk_band: risk };
}
