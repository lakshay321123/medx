export type PFRInputs = { pao2_mm_hg: number; fio2_percent: number };

export function calc_p_f_ratio(i: PFRInputs): { ratio: number; category: "none"|"mild"|"moderate"|"severe" } {
  const fio2 = i.fio2_percent / 100;
  const ratio = i.pao2_mm_hg / Math.max(0.21, fio2);
  let cat: "none"|"mild"|"moderate"|"severe" = "none";
  if (ratio < 100) cat = "severe";
  else if (ratio < 200) cat = "moderate";
  else if (ratio < 300) cat = "mild";
  return { ratio, category: cat };
}

const def = {
  id: "p_f_ratio",
  label: "PaO₂/FiO₂ (P/F) ratio",
  inputs: [
    { id: "pao2_mm_hg", label: "PaO₂ (mmHg)", type: "number", min: 0 },
    { id: "fio2_percent", label: "FiO₂ (%)", type: "number", min: 21, max: 100 }
  ],
  run: (args: PFRInputs) => {
    const r = calc_p_f_ratio(args);
    const notes = [r.category];
    return { id: "p_f_ratio", label: "P/F Ratio", value: r.ratio, unit: "", precision: 0, notes, extra: r };
  },
};

export default def;
