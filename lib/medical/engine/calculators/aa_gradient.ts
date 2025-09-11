// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type AAGradInputs = {
  fio2: number;
  pao2_mm_hg: number;
  paco2_mm_hg: number;
  baro_mm_hg?: number;
  r?: number;
};

export function calc_aa_gradient(i: AAGradInputs): { alveolar_o2_mm_hg: number; gradient_mm_hg: number } {
  const Patm = (typeof i.baro_mm_hg === "number" && i.baro_mm_hg > 0) ? i.baro_mm_hg : 760;
  const PH2O = 47;
  const R = (typeof i.r === "number" && i.r > 0) ? i.r : 0.8;
  const PAO2 = i.fio2 * (Patm - PH2O) - (i.paco2_mm_hg / R);
  const grad = PAO2 - i.pao2_mm_hg;
  return { alveolar_o2_mm_hg: PAO2, gradient_mm_hg: grad };
}

const def = {
  id: "aa_gradient",
  label: "A–a Gradient",
  inputs: [
    { id: "fio2", label: "FiO2 (fraction)", type: "number", min: 0.15, max: 1 },
    { id: "pao2_mm_hg", label: "PaO2 (mmHg)", type: "number", min: 0 },
    { id: "paco2_mm_hg", label: "PaCO2 (mmHg)", type: "number", min: 0 },
    { id: "baro_mm_hg", label: "Barometric pressure (mmHg)", type: "number", min: 400, max: 800 },
    { id: "r", label: "R (respiratory quotient)", type: "number", min: 0.5, max: 1.2 }
  ],
  run: (args: AAGradInputs) => {
    const r = calc_aa_gradient(args);
    const notes = [`PAO2 ${r.alveolar_o2_mm_hg.toFixed(1)} mmHg`];
    return { id: "aa_gradient", label: "A–a Gradient", value: r.gradient_mm_hg, unit: "mmHg", precision: 1, notes, extra: r };
  },
};

export default def;
