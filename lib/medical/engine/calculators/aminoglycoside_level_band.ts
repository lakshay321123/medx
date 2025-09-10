
import { register } from "../registry";
export type Aminoglycoside = "gentamicin" | "tobramycin" | "amikacin";
export interface AminoglycosideInput { drug: Aminoglycoside; peak_mcg_ml?: number; trough_mcg_ml?: number; }
export interface AminoglycosideResult { peak_ok?: boolean; trough_ok?: boolean; notes: string[]; }
export function runAminoglycosideBand(i: AminoglycosideInput): AminoglycosideResult {
  const notes: string[] = [];
  let peak_ok: boolean | undefined;
  let trough_ok: boolean | undefined;
  if (i.drug === "gentamicin" || i.drug === "tobramycin") {
    if (i.peak_mcg_ml != null) peak_ok = i.peak_mcg_ml >= 5 && i.peak_mcg_ml <= 10;
    if (i.trough_mcg_ml != null) trough_ok = i.trough_mcg_ml < 2;
    notes.push("target peak 5–10, trough <2");
  } else if (i.drug === "amikacin") {
    if (i.peak_mcg_ml != null) peak_ok = i.peak_mcg_ml >= 20 && i.peak_mcg_ml <= 30;
    if (i.trough_mcg_ml != null) trough_ok = i.trough_mcg_ml < 5;
    notes.push("target peak 20–30, trough <5");
  }
  return { peak_ok, trough_ok, notes };
}
register({
  id: "aminoglycoside_level_band",
  label: "Aminoglycoside level band",
  inputs: [{ key: "drug", required: true }, { key: "peak_mcg_ml" }, { key: "trough_mcg_ml" }],
  run: ({ drug, peak_mcg_ml, trough_mcg_ml }) => {
    if (drug == null) return null;
    const r = runAminoglycosideBand({ drug, peak_mcg_ml, trough_mcg_ml });
    const notes = [...r.notes];
    if (r.peak_ok != null) notes.push(`peak ${r.peak_ok ? "OK" : "out of range"}`);
    if (r.trough_ok != null) notes.push(`trough ${r.trough_ok ? "OK" : "out of range"}`);
    return { id: "aminoglycoside_level_band", label: "Aminoglycoside", notes, precision: 0 };
  },
});
