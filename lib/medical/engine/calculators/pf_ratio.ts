// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type PFRatioInputs = { pao2_mm_hg: number; fio2: number };

export function calc_pf_ratio({ pao2_mm_hg, fio2 }: PFRatioInputs): number {
  if (fio2 <= 0) return NaN;
  return pao2_mm_hg / fio2;
}

const def = {
  id: "pf_ratio",
  label: "P/F Ratio (PaO2/FiO2)",
  inputs: [
    { id: "pao2_mm_hg", label: "PaO2 (mmHg)", type: "number", min: 0 },
    { id: "fio2", label: "FiO2 (fraction)", type: "number", min: 0.15, max: 1.0 }
  ],
  run: (args: PFRatioInputs) => {
    const v = calc_pf_ratio(args);
    const notes = [v < 100 ? "severe" : v < 200 ? "moderate" : v < 300 ? "mild" : "no ARDS by P/F"];
    return { id: "pf_ratio", label: "P/F Ratio", value: v, unit: "", precision: 0, notes };
  },
};

export default def;
