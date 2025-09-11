// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type AAGradientInputs = {
  fio2: number; // 0.21 - 1.0
  pao2_mm_hg: number;
  paco2_mm_hg: number;
  barometric_mm_hg?: number; // default 760
  r?: number; // default 0.8
};

export function calc_aa_gradient(i: AAGradientInputs): number {
  const Patm = (typeof i.barometric_mm_hg === "number") ? i.barometric_mm_hg : 760;
  const R = (typeof i.r === "number") ? i.r : 0.8;
  const PH2O = 47;
  const PAO2 = i.fio2 * (Patm - PH2O) - (i.paco2_mm_hg / R);
  return PAO2 - i.pao2_mm_hg;
}

const def = {
  id: "aa_gradient",
  label: "A–a Gradient",
  inputs: [
    { id: "fio2", label: "FiO2 (fraction)", type: "number", min: 0.21, max: 1, step: 0.01 },
    { id: "pao2_mm_hg", label: "PaO2 (mmHg)", type: "number", min: 0 },
    { id: "paco2_mm_hg", label: "PaCO2 (mmHg)", type: "number", min: 0 },
    { id: "barometric_mm_hg", label: "Barometric pressure (mmHg)", type: "number", min: 400, max: 800 },
    { id: "r", label: "Respiratory quotient R", type: "number", min: 0.5, max: 1.0, step: 0.05 }
  ],
  run: (args: AAGradientInputs) => {
    const v = calc_aa_gradient(args);
    return { id: "aa_gradient", label: "A–a Gradient", value: v, unit: "mmHg", precision: 1, notes: [] };
  },
};

export default def;
