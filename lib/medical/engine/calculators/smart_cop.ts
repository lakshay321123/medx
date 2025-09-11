// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type SmartCOPInputs = {
  age_years: number;
  sbp_mm_hg: number;
  multilobar_involvement: boolean;
  albumin_g_dl: number;
  resp_rate: number;
  heart_rate: number;
  confusion: boolean;
  spo2_percent?: number;
  pao2_mm_hg?: number;
  ph?: number;
};

function oxygen_low(i: SmartCOPInputs): boolean {
  // If PaO2 present, use it; otherwise use SpO2 if present, with age cutoffs
  if (typeof i.pao2_mm_hg === "number") {
    if (i.age_years < 50) return i.pao2_mm_hg < 70;
    return i.pao2_mm_hg < 60;
  }
  if (typeof i.spo2_percent === "number") {
    if (i.age_years < 50) return i.spo2_percent <= 93;
    return i.spo2_percent <= 90;
  }
  return false;
}

export function calc_smart_cop(i: SmartCOPInputs): { score: number; risk: "low"|"moderate"|"high" } {
  let s = 0;
  // S (2)
  if (i.sbp_mm_hg < 90) s += 2;
  // M (1)
  if (i.multilobar_involvement) s += 1;
  // A (1)
  if (i.albumin_g_dl < 3.5) s += 1;
  // R (1) age-dependent
  if ((i.age_years < 50 && i.resp_rate >= 25) || (i.age_years >= 50 && i.resp_rate >= 30)) s += 1;
  // T (1)
  if (i.heart_rate >= 125) s += 1;
  // C (1)
  if (i.confusion) s += 1;
  // O (2)
  if (oxygen_low(i)) s += 2;
  // P (2)
  if (typeof i.ph === "number" && i.ph < 7.35) s += 2;
  let risk: "low"|"moderate"|"high" = "low";
  if (s >= 5) risk = "high";
  else if (s >= 3) risk = "moderate";
  return { score: s, risk };
}

const def = {
  id: "smart_cop",
  label: "SMART-COP (severe CAP)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "sbp_mm_hg", label: "SBP (mmHg)", type: "number", min: 0 },
    { id: "multilobar_involvement", label: "Multilobar involvement on CXR", type: "boolean" },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0 },
    { id: "resp_rate", label: "Respiratory rate (/min)", type: "number", min: 0 },
    { id: "heart_rate", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "confusion", label: "Acute confusion", type: "boolean" },
    { id: "spo2_percent", label: "SpO2 (%)", type: "number", min: 0, max: 100 },
    { id: "pao2_mm_hg", label: "PaO2 (mmHg)", type: "number", min: 0 },
    { id: "ph", label: "Arterial pH", type: "number", min: 6.8, max: 7.8 }
  ],
  run: (args: SmartCOPInputs) => {
    const r = calc_smart_cop(args);
    const notes = [r.risk];
    return { id: "smart_cop", label: "SMART-COP", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
