import { register } from "../registry";

/** Alveolar oxygen (PAO2) from alveolar gas equation. Defaults Patm=760, PH2O=47, R=0.8 */
export type PAO2Inputs = { FiO2: number; PaCO2: number; Patm_mmHg?: number; PH2O_mmHg?: number; R?: number };

export function runPAO2({ FiO2, PaCO2, Patm_mmHg=760, PH2O_mmHg=47, R=0.8 }: PAO2Inputs) {
  if ([FiO2,PaCO2].some(v=>v==null) || FiO2<=0) return null;
  const PAO2 = FiO2*(Patm_mmHg - PH2O_mmHg) - (PaCO2/R);
  return { PAO2_mmHg: PAO2 };
}

register({
  id: "pao2_alveolar",
  label: "Alveolar O2 (PAO2)",
  inputs: [
    { key: "FiO2", required: true },
    { key: "PaCO2", required: true },
    { key: "Patm_mmHg" },
    { key: "PH2O_mmHg" },
    { key: "R" },
  ],
  run: (ctx: any) => {
    const r = runPAO2(ctx as PAO2Inputs);
    if (!r) return null;
    return { id: "pao2_alveolar", label: "Alveolar O2 (PAO2)", value: Number(r.PAO2_mmHg.toFixed(0)), unit: "mmHg", precision: 0, notes: [] };
  },
});
