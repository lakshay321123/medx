import { register } from "../registry";

export interface CorrectedCaInput {
  calcium_mg_dl: number;
  albumin_g_dl: number;
  correction_per_g?: number; // default 0.8 mg/dL per 1 g/dL albumin
  target_albumin_g_dl?: number; // default 4.0
}
export function runCorrectedCa(i: CorrectedCaInput) {
  const corr = i.correction_per_g ?? 0.8;
  const target = i.target_albumin_g_dl ?? 4.0;
  const corrected = i.calcium_mg_dl + corr * (target - i.albumin_g_dl);
  return { corrected_calcium_mg_dl: Number(corrected.toFixed(2)) };
}

register({
  id: "calcium_corrected_albumin",
  label: "Corrected Ca (albumin)",
  inputs: [
    { key: "calcium_mg_dl", required: true },
    { key: "albumin_g_dl", required: true },
    { key: "correction_per_g" },
    { key: "target_albumin_g_dl" },
  ],
  run: (ctx: any) => {
    const { calcium_mg_dl, albumin_g_dl, correction_per_g, target_albumin_g_dl } = ctx as CorrectedCaInput;
    if (calcium_mg_dl == null || albumin_g_dl == null) return null;
    const r = runCorrectedCa({ calcium_mg_dl, albumin_g_dl, correction_per_g, target_albumin_g_dl });
    return { id: "calcium_corrected_albumin", label: "Corrected Ca", value: r.corrected_calcium_mg_dl, unit: "mg/dL", precision: 2 };
  },
});
