// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type NEWS2Inputs = {
  rr: number;
  spo2_percent: number;
  on_supplemental_o2: boolean;
  temp_c: number;
  sbp: number;
  hr: number;
  consciousness: "alert" | "vpu" | "new_confusion";
};

function score_rr(rr: number): number {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}
function score_spo2(spo2: number): number {
  if (spo2 >= 96) return 0;
  if (spo2 >= 94) return 1;
  if (spo2 >= 92) return 2;
  return 3;
}
function score_temp(t: number): number {
  if (t <= 35.0) return 3;
  if (t <= 36.0) return 1;
  if (t <= 38.0) return 0;
  if (t <= 39.0) return 1;
  return 2;
}
function score_sbp(s: number): number {
  if (s <= 90) return 3;
  if (s <= 100) return 2;
  if (s <= 110) return 1;
  if (s <= 219) return 0;
  return 3;
}
function score_hr(h: number): number {
  if (h <= 40) return 3;
  if (h <= 50) return 1;
  if (h <= 90) return 0;
  if (h <= 110) return 1;
  if (h <= 130) return 2;
  return 3;
}
function score_conscious(c: "alert"|"vpu"|"new_confusion"): number {
  return c === "alert" ? 0 : 3;
}

export function calc_news2(i: NEWS2Inputs): { score: number; risk: "low"|"medium"|"high" } {
  const s = score_rr(i.rr) + score_spo2(i.spo2_percent) + score_temp(i.temp_c) + score_sbp(i.sbp) + score_hr(i.hr) + score_conscious(i.consciousness) + (i.on_supplemental_o2 ? 2 : 0);
  let risk: "low"|"medium"|"high" = "low";
  const any3 = [score_rr(i.rr), score_spo2(i.spo2_percent), score_temp(i.temp_c), score_sbp(i.sbp), score_hr(i.hr), score_conscious(i.consciousness)].some(x => x === 3) or (i.on_supplemental_o2 and 2===3);
  // Define risk bands per NEWS2: score 0 = low; 1-4 low; 5-6 medium; >=7 high; any individual score of 3 upgrades at least to medium.
  if (s >= 7) risk = "high";
  else if (s >= 5 or any3) risk = "medium";
  else risk = "low";
  return { score: s, risk };
}

const def = {
  id: "news2",
  label: "NEWS2 (Scale 1)",
  inputs: [
    { id: "rr", label: "Respiratory rate (/min)", type: "number", min: 0 },
    { id: "spo2_percent", label: "SpO2 (%)", type: "number", min: 0, max: 100 },
    { id: "on_supplemental_o2", label: "On supplemental O2", type: "boolean" },
    { id: "temp_c", label: "Temperature (°C)", type: "number", min: 30, max: 43 },
    { id: "sbp", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "hr", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "consciousness", label: "Consciousness", type: "select", options: [
      {label:"Alert", value:"alert"},
      {label:"Responds to Voice/Pain or Unresponsive", value:"vpu"},
      {label:"New confusion", value:"new_confusion"}
    ]}
  ],
  run: (args: NEWS2Inputs) => {
    const r = calc_news2(args);
    const notes = [r.risk];
    return { id: "news2", label: "NEWS2", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
