export type AAGradInputs = {
  age_years: number;
  fio2_percent: number;
  pao2_mm_hg: number;
  paco2_mm_hg: number;
  patm_mm_hg?: number;
  ph2o_mm_hg?: number;
  rq?: number;
};

export function calc_a_a_gradient(i: AAGradInputs): { alveolar_po2: number; aagrad: number; expected_normal: number } {
  const patm = typeof i.patm_mm_hg === "number" ? i.patm_mm_hg : 760;
  const ph2o = typeof i.ph2o_mm_hg === "number" ? i.ph2o_mm_hg : 47;
  const rq = typeof i.rq === "number" ? i.rq : 0.8;
  const fio2 = i.fio2_percent / 100;
  const pao2_alv = (patm - ph2o) * fio2 - (i.paco2_mm_hg / rq);
  const aagrad = pao2_alv - i.pao2_mm_hg;
  const expected = (i.age_years + 10) / 4;
  return { alveolar_po2: pao2_alv, aagrad, expected_normal: expected };
}

const def = {
  id: "a_a_gradient",
  label: "A–a Gradient",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "fio2_percent", label: "FiO₂ (%)", type: "number", min: 21, max: 100 },
    { id: "pao2_mm_hg", label: "PaO₂ (mmHg)", type: "number", min: 0 },
    { id: "paco2_mm_hg", label: "PaCO₂ (mmHg)", type: "number", min: 0 },
    { id: "patm_mm_hg", label: "Atmospheric pressure (mmHg)", type: "number", min: 400, max: 800 },
    { id: "ph2o_mm_hg", label: "Water vapor pressure (mmHg)", type: "number", min: 30, max: 60 },
    { id: "rq", label: "Respiratory quotient", type: "number", min: 0.6, max: 1.0 }
  ],
  run: (args: AAGradInputs) => {
    const r = calc_a_a_gradient(args);
    const notes = [`Expected normal ≈ ${(r.expected_normal).toFixed(1)} mmHg`];
    return { id: "a_a_gradient", label: "A–a Gradient", value: r.aagrad, unit: "mmHg", precision: 1, notes, extra: r };
  },
};

export default def;
