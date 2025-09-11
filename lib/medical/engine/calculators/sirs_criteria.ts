export type SIRSInputs = { temp_c:number; hr:number; rr:number; paco2_mm_hg?:number; wbc_k:number; bands_percent?:number };

export function calc_sirs(i: SIRSInputs): { score:number; sepsis_flag:boolean } {
  let s = 0;
  if (i.temp_c > 38 || i.temp_c < 36) s++;
  if (i.hr > 90) s++;
  if (i.rr > 20 || (typeof i.paco2_mm_hg === "number" && i.paco2_mm_hg < 32)) s++;
  if (i.wbc_k > 12 || i.wbc_k < 4 || (typeof i.bands_percent === "number" && i.bands_percent > 10)) s++;
  return { score: s, sepsis_flag: s >= 2 };
}

const def = {
  id: "sirs_criteria",
  label: "SIRS Criteria",
  inputs: [
    { id: "temp_c", label: "Temperature (°C)", type: "number", min: 25, max: 45 },
    { id: "hr", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "rr", label: "Respiratory rate (breaths/min)", type: "number", min: 0 },
    { id: "paco2_mm_hg", label: "PaCO₂ (mmHg)", type: "number", min: 10, max: 80 },
    { id: "wbc_k", label: "WBC (×10⁹/L)", type: "number", min: 0 },
    { id: "bands_percent", label: "Bands (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: SIRSInputs) => {
    const r = calc_sirs(args);
    const notes = [r.sepsis_flag ? "≥2 criteria" : ""];
    return { id: "sirs_criteria", label: "SIRS", value: r.score, unit: "criteria", precision: 0, notes: notes.filter(Boolean), extra: r };
  },
};

export default def;
