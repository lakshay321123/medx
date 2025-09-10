/**
 * NEWS2 (0–20) — National Early Warning Score 2
 * Inputs: RR, SpO2, O2 supplemental, Temp, SBP, HR, Consciousness (AVPU or new confusion)
 * Returns total and per-parameter points
 */
export type AVPU = "A" | "V" | "P" | "U" | "Confusion";
export interface NEWS2Input {
  rr: number;
  spo2: number;
  o2_supplemental: boolean;
  temp_c: number;
  sbp: number;
  hr: number;
  consciousness: AVPU;
}
export interface NEWS2Result {
  total: number;
  parts: { rr: number; spo2: number; o2: number; temp: number; sbp: number; hr: number; cns: number; };
}
function scoreRR(v: number) {
  if (v <= 8) return 3;
  if (v <= 11) return 1;
  if (v <= 20) return 0;
  if (v <= 24) return 2;
  return 3;
}
function scoreSpO2(v: number) {
  if (v <= 91) return 3;
  if (v <= 93) return 2;
  if (v <= 95) return 1;
  return 0;
}
function scoreO2(supp: boolean) { return supp ? 2 : 0; }
function scoreTemp(v: number) {
  if (v <= 35.0) return 3;
  if (v <= 36.0) return 1;
  if (v <= 38.0) return 0;
  if (v <= 39.0) return 1;
  return 2;
}
function scoreSBP(v: number) {
  if (v <= 90) return 3;
  if (v <= 100) return 2;
  if (v <= 110) return 1;
  if (v <= 219) return 0;
  return 3;
}
function scoreHR(v: number) {
  if (v <= 40) return 3;
  if (v <= 50) return 1;
  if (v <= 90) return 0;
  if (v <= 110) return 1;
  if (v <= 130) return 2;
  return 3;
}
function scoreCNS(v: AVPU) { return v === "A" ? 0 : 3; }
export function runNEWS2(i: NEWS2Input): NEWS2Result {
  const rr = scoreRR(i.rr);
  const spo2 = scoreSpO2(i.spo2);
  const o2 = scoreO2(i.o2_supplemental);
  const temp = scoreTemp(i.temp_c);
  const sbp = scoreSBP(i.sbp);
  const hr = scoreHR(i.hr);
  const cns = scoreCNS(i.consciousness);
  const total = rr + spo2 + o2 + temp + sbp + hr + cns;
  return { total, parts: { rr, spo2, o2, temp, sbp, hr, cns } };
}
