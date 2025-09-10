import { register } from "../registry";

/**
 * Alveolar–arterial (A–a) O2 gradient:
 * PAO2 = FiO2 * (Patm - PH2O) - PaCO2 / R
 * A–a = PAO2 - PaO2
 * Defaults: Patm=760 mmHg, PH2O=47 mmHg, R=0.8
 * Optional expected normal ≈ (age/4 + 4)
 */
export type AAGInputs = {
  PaO2: number;
  FiO2: number;        // 0–1
  PaCO2: number;
  Patm_mmHg?: number;
  PH2O_mmHg?: number;
  R?: number;
  age_years?: number;
};

export function runAAG(i: AAGInputs) {
  const { PaO2, FiO2, PaCO2 } = i;
  if ([PaO2,FiO2,PaCO2].some(v => v == null) || FiO2 <= 0) return null;
  const Patm = (i.Patm_mmHg ?? 760);
  const PH2O = (i.PH2O_mmHg ?? 47);
  const R = (i.R ?? 0.8);
  const PAO2 = FiO2 * (Patm - PH2O) - (PaCO2 / R);
  const AA = PAO2 - PaO2;
  const notes: string[] = [];
  if (typeof i.age_years === "number") {
    const expected = i.age_years/4 + 4;
    notes.push(`expected ≤ ~${expected.toFixed(0)} mmHg`);
  }
  return { PAO2, AA, notes };
}

register({
  id: "a_a_gradient",
  label: "A–a gradient",
  inputs: [
    { key: "PaO2", required: true },
    { key: "FiO2", required: true },
    { key: "PaCO2", required: true },
    { key: "Patm_mmHg" },
    { key: "PH2O_mmHg" },
    { key: "R" },
    { key: "age_years" },
  ],
  run: (ctx) => {
    const r = runAAG(ctx as AAGInputs);
    if (!r) return null;
    const notes = r.notes ?? [];
    notes.push(`PAO2 ${r.PAO2.toFixed(0)} mmHg`);
    return { id: "a_a_gradient", label: "A–a gradient", value: Number(r.AA.toFixed(0)), unit: "mmHg", precision: 0, notes };
  },
});
