import { register } from "../registry";

/**
 * Corrected sodium for hyperglycemia (Katz 1973): +1.6 mEq/L per 100 mg/dL glucose above 100.
 */
export type CorrNaInputs = { Na_meq_l: number; glucose_mg_dl: number };

export function runCorrectedNa({ Na_meq_l, glucose_mg_dl }: CorrNaInputs) {
  if ([Na_meq_l,glucose_mg_dl].some(v => v == null)) return null;
  const delta = Math.max(0, (glucose_mg_dl - 100) / 100) * 1.6;
  const corrected = Na_meq_l + delta;
  return { corrected_na_meq_l: corrected };
}

register({
  id: "corrected_na_glucose",
  label: "Corrected Na (hyperglycemia)",
  inputs: [
    { key: "Na_meq_l", required: true },
    { key: "glucose_mg_dl", required: true },
  ],
  run: (ctx: any) => {
    const r = runCorrectedNa(ctx as CorrNaInputs);
    if (!r) return null;
    return { id: "corrected_na_glucose", label: "Corrected Na (hyperglycemia)", value: Number(r.corrected_na_meq_l.toFixed(1)), unit: "mEq/L", precision: 1, notes: [] };
  },
});
