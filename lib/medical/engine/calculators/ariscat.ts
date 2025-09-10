/**
 * ARISCAT (Canet score) for postoperative pulmonary complications
 * Points (commonly used mapping):
 * Age: 51–80 (3), >80 (16)
 * SpO2 (room air): 91–95 (8), <=90 (24)
 * Respiratory infection last month: 17
 * Pre-op anemia Hb<10 g/dL: 11
 * Surgical incision: upper abdominal (15), intrathoracic (24)
 * Duration of surgery: 2–3h (16), >3h (23)
 * Emergency: 8
 * Risk bands: Low <26, Intermediate 26–44, High >=45
 */
export interface ARISCATInput {
  age: number;
  spo2_room_air?: number; // %
  recent_resp_infection?: boolean; // last month
  preop_anemia_hb_lt10?: boolean;
  incision?: "none" | "peripheral" | "upper_abdominal" | "intrathoracic";
  duration_hours?: number; // expected duration
  emergency?: boolean;
}
export interface ARISCATResult {
  points: number;
  risk_band: "low" | "intermediate" | "high";
}
export function runARISCAT(i: ARISCATInput): ARISCATResult {
  let pts = 0;
  // Age
  if (i.age > 80) pts += 16;
  else if (i.age >= 51) pts += 3;

  // SpO2
  if (i.spo2_room_air != null) {
    if (i.spo2_room_air <= 90) pts += 24;
    else if (i.spo2_room_air <= 95) pts += 8;
  }

  if (i.recent_resp_infection) pts += 17;
  if (i.preop_anemia_hb_lt10) pts += 11;

  // Incision
  if (i.incision === "upper_abdominal") pts += 15;
  else if (i.incision === "intrathoracic") pts += 24;

  // Duration
  if (i.duration_hours != null) {
    if (i.duration_hours > 3) pts += 23;
    else if (i.duration_hours >= 2) pts += 16;
  }

  if (i.emergency) pts += 8;

  let risk: ARISCATResult["risk_band"] = "low";
  if (pts >= 45) risk = "high";
  else if (pts >= 26) risk = "intermediate";

  return { points: pts, risk_band: risk };
}
