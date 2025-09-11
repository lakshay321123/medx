// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type SIRSInputs = {
  temp_c: number;
  hr_bpm: number;
  rr_bpm: number;
  paco2_mm_hg: number;
  wbc_10e9_l: number;
  bands_percent: number;
};

export function calc_sirs(i: SIRSInputs): number {
  let s = 0;
  if (i.temp_c > 38 || i.temp_c < 36) s += 1;
  if (i.hr_bpm > 90) s += 1;
  if (i.rr_bpm > 20 || i.paco2_mm_hg < 32) s += 1;
  if (i.wbc_10e9_l > 12 || i.wbc_10e9_l < 4 || i.bands_percent > 10) s += 1;
  return s;
}

const def = {
  id: "sirs",
  label: "SIRS Criteria",
  inputs: [
    { id: "temp_c", label: "Temperature (°C)", type: "number", min: 25, max: 45 },
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "rr_bpm", label: "Respiratory rate (/min)", type: "number", min: 0 },
    { id: "paco2_mm_hg", label: "PaCO2 (mmHg)", type: "number", min: 0 },
    { id: "wbc_10e9_l", label: "WBC (×10^9/L)", type: "number", min: 0 },
    { id: "bands_percent", label: "Bands (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: SIRSInputs) => {
    const v = calc_sirs(args);
    return { id: "sirs", label: "SIRS", value: v, unit: "criteria", precision: 0, notes: [] };
  },
};

export default def;
