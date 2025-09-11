export type ROXInputs = { spo2_percent: number; fio2_percent: number; rr: number };

export function calc_rox_index(i: ROXInputs): number {
  const s2f = i.spo2_percent / Math.max(0.21*100, i.fio2_percent);
  const rr_sqrt = Math.sqrt(Math.max(1, i.rr));
  return (s2f) / rr_sqrt;
}

const def = {
  id: "rox_index",
  label: "ROX Index ((SpO2/FiO2)/√RR)",
  inputs: [
    { id: "spo2_percent", label: "SpO₂ (%)", type: "number", min: 50, max: 100 },
    { id: "fio2_percent", label: "FiO₂ (%)", type: "number", min: 21, max: 100 },
    { id: "rr", label: "Respiratory rate (/min)", type: "number", min: 1, max: 80 }
  ],
  run: (args: ROXInputs) => {
    const v = calc_rox_index(args);
    return { id: "rox_index", label: "ROX Index", value: v, unit: "", precision: 2, notes: [] };
  },
};

export default def;
