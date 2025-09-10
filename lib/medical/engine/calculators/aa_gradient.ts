import { register } from "../registry";

/**
 * Alveolar–arterial (A–a) O2 gradient
 * PAO2 = FiO2*(Pb - PH2O) - PaCO2/R
 * A–a = PAO2 - PaO2
 */
export function calc_aa_gradient({
  fio2, pao2, paco2, pb, r
}: {
  fio2?: number, // fraction 0-1, default 0.21
  pao2: number,  // arterial PaO2 (mmHg)
  paco2: number, // arterial PaCO2 (mmHg)
  pb?: number,   // barometric pressure (mmHg), default 760
  r?: number     // respiratory quotient, default 0.8
}) {
  const FiO2 = (fio2 ?? 0.21);
  const Pb = (pb ?? 760);
  const PH2O = 47;
  const R = (r ?? 0.8);
  const PAO2 = FiO2 * (Pb - PH2O) - (paco2 / R);
  const Aa = PAO2 - pao2;
  return { PAO2, Aa };
}

register({
  id: "aa_gradient",
  label: "A–a O2 Gradient",
  tags: ["pulmonology", "critical care"],
  inputs: [
    { key: "fio2" },
    { key: "pao2", required: true },
    { key: "paco2", required: true },
    { key: "pb" },
    { key: "r" }
  ],
  run: ({ fio2, pao2, paco2, pb, r }: { fio2?: number; pao2: number; paco2: number; pb?: number; r?: number; }) => {
    const res = calc_aa_gradient({ fio2, pao2, paco2, pb, r });
    const notes = [`PAO2≈${Math.round(res.PAO2)}`];
    return { id: "aa_gradient", label: "A–a O2 Gradient", value: res.Aa, unit: "mmHg", precision: 0, notes, extra: res };
  },
});
