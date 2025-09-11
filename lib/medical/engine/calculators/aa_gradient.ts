export type AAGInputs = { fio2:number; pao2_mm_hg:number; paco2_mm_hg:number; barometric_mm_hg?:number; r?:number };

export function calc_aa_gradient(i: AAGInputs): { aa:number; alveolar_o2:number } {
  const Patm = (typeof i.barometric_mm_hg === "number" && i.barometric_mm_hg > 0) ? i.barometric_mm_hg : 760;
  const PH2O = 47;
  const R = (typeof i.r === "number" && i.r > 0) ? i.r : 0.8;
  const PAO2 = i.fio2 * (Patm - PH2O) - (i.paco2_mm_hg / R);
  const aa = PAO2 - i.pao2_mm_hg;
  return { aa, alveolar_o2: PAO2 };
}

const def = {
  id: "aa_gradient",
  label: "A–a Gradient",
  inputs: [
    { id: "fio2", label: "FiO₂ (fraction, e.g., 0.21)", type: "number", min: 0.21, max: 1 },
    { id: "pao2_mm_hg", label: "PaO₂ (mmHg)", type: "number", min: 0 },
    { id: "paco2_mm_hg", label: "PaCO₂ (mmHg)", type: "number", min: 0 },
    { id: "barometric_mm_hg", label: "Barometric pressure (mmHg)", type: "number", min: 300, max: 800 },
    { id: "r", label: "Respiratory quotient R", type: "number", min: 0.5, max: 1.0 }
  ],
  run: (args: AAGInputs) => {
    const r = calc_aa_gradient(args);
    const notes = [`Alveolar O₂ ${r.alveolar_o2.toFixed(0)} mmHg`];
    return { id: "aa_gradient", label: "A–a Gradient", value: r.aa, unit: "mmHg", precision: 0, notes, extra: r };
  },
};

export default def;
