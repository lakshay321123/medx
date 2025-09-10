
import { register } from "../registry";
export interface RenalFlagsInput { egfr_ml_min_1_73m2: number; }
export function runRenalDoseFlags(i: RenalFlagsInput) {
  const g = i.egfr_ml_min_1_73m2;
  let band: "normal"|"mild"|"moderate"|"severe"|"failure" = "normal";
  let note = "no routine adjustment";
  if (g < 15) { band = "failure"; note = "avoid renally-cleared drugs or use post-dialysis dosing"; }
  else if (g < 30) { band = "severe"; note = "reduce dose / extend interval"; }
  else if (g < 60) { band = "moderate"; note = "consider dose reduction"; }
  else if (g < 90) { band = "mild"; note = "usually no change"; }
  return { band, note };
}
register({
  id: "renal_dose_flags",
  label: "Renal dose flag (eGFR)",
  inputs: [{ key: "egfr_ml_min_1_73m2", required: true }],
  run: ({ egfr_ml_min_1_73m2 }) => {
    if (egfr_ml_min_1_73m2 == null) return null;
    const r = runRenalDoseFlags({ egfr_ml_min_1_73m2 });
    return { id: "renal_dose_flags", label: "Renal impairment", notes: [`${r.band}`, r.note] };
  },
});
