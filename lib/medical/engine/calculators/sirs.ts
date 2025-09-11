export type SIRSInputs = {
  temp_c: number;
  hr_bpm: number;
  rr_per_min: number;
  paco2_mm_hg?: number;
  wbc_k_per_uL: number;
  bands_percent?: number;
};

export function calc_sirs(i: SIRSInputs): number {
  let s = 0;
  if (i.temp_c < 36 || i.temp_c > 38) s += 1;
  if (i.hr_bpm > 90) s += 1;
  const resp_flag = i.rr_per_min > 20 || (typeof i.paco2_mm_hg === "number" && i.paco2_mm_hg < 32);
  if (resp_flag) s += 1;
  const wbc_flag = i.wbc_k_per_uL < 4 || i.wbc_k_per_uL > 12 || (typeof i.bands_percent === "number" && i.bands_percent > 10);
  if (wbc_flag) s += 1;
  return s;
}

const def = {
  id: "sirs",
  label: "SIRS Criteria (0–4)",
  inputs: [
    { id: "temp_c", label: "Temperature (°C)", type: "number", min: 30, max: 43 },
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "rr_per_min", label: "Respiratory rate (/min)", type: "number", min: 0 },
    { id: "paco2_mm_hg", label: "PaCO2 (mmHg)", type: "number", min: 0 },
    { id: "wbc_k_per_uL", label: "WBC (×10³/µL)", type: "number", min: 0 },
    { id: "bands_percent", label: "Bands (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: SIRSInputs) => {
    const v = calc_sirs(args);
    const notes = [v >= 2 ? "meets SIRS (if infection suspected: possible sepsis)" : "below SIRS threshold"];
    return { id: "sirs", label: "SIRS", value: v, unit: "criteria", precision: 0, notes };
  },
};

export default def;
