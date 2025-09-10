import { register } from "../registry";

export interface CorrectedNaInput {
  Na_meq_l: number;
  glucose_mg_dl: number;
  factor_per_100mgdl?: number; // default 1.6; some use 2.4
}
export function runCorrectedNa(i: CorrectedNaInput) {
  const f = i.factor_per_100mgdl ?? 1.6;
  const delta = Math.max(0, (i.glucose_mg_dl - 100) / 100) * f;
  const corrected = i.Na_meq_l + delta;
  return { corrected_Na_meq_l: Number(corrected.toFixed(1)), delta_na: Number(delta.toFixed(1)) };
}

register({
  id: "corrected_sodium_hyperglycemia",
  label: "Corrected Na (hyperglycemia)",
  inputs: [
    { key: "Na_meq_l", required: true },
    { key: "glucose_mg_dl", required: true },
    { key: "factor_per_100mgdl" },
  ],
  run: ({ Na_meq_l, glucose_mg_dl, factor_per_100mgdl }) => {
    if (Na_meq_l == null || glucose_mg_dl == null) return null;
    const r = runCorrectedNa({ Na_meq_l, glucose_mg_dl, factor_per_100mgdl });
    return {
      id: "corrected_sodium_hyperglycemia",
      label: "Corrected Na",
      value: r.corrected_Na_meq_l,
      unit: "mEq/L",
      notes: [`ΔNa +${r.delta_na} for hyperglycemia`],
      precision: 1,
    };
  },
});
