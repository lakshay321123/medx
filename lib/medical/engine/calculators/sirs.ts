export type SIRSInputs = {
  temp_c: number;
  hr_bpm: number;
  rr_bpm: number;
  paco2_mm_hg: number;
  wbc_k_per_uL: number;
  bands_percent?: number;
};

export function calc_sirs(i: SIRSInputs): number {
  let s = 0;
  s += (i.temp_c > 38.0 || i.temp_c < 36.0) ? 1 : 0;
  s += (i.hr_bpm > 90) ? 1 : 0;
  s += (i.rr_bpm > 20 || i.paco2_mm_hg < 32) ? 1 : 0;
  s += (i.wbc_k_per_uL > 12 || i.wbc_k_per_uL < 4 || (typeof i.bands_percent === "number" && i.bands_percent > 10)) ? 1 : 0;
  return s;
}

const def = {
  id: "sirs",
  label: "SIRS Criteria",
  inputs: [
    { id: "temp_c", label: "Temperature (°C)", type: "number", min: 25, max: 45 },
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "rr_bpm", label: "Respiratory rate (breaths/min)", type: "number", min: 0 },
    { id: "paco2_mm_hg", label: "PaCO₂ (mmHg)", type: "number", min: 0 },
    { id: "wbc_k_per_uL", label: "WBC (×10³/µL)", type: "number", min: 0 },
    { id: "bands_percent", label: "Bands (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: SIRSInputs) => {
    const v = calc_sirs(args);
    const notes = [v >= 2 ? "SIRS present (≥2)" : ""];
    return { id: "sirs", label: "SIRS", value: v, unit: "criteria", precision: 0, notes: notes.filter(Boolean) };
  },
};

export default def;
