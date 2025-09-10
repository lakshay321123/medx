
import { register } from "../registry";
export interface HepaticFlagsInput { child_pugh_points: number; }
export function runHepaticDoseFlags(i: HepaticFlagsInput) {
  const p = i.child_pugh_points;
  let band: "A"|"B"|"C" = "A";
  let note = "no routine adjustment";
  if (p >= 7 && p <= 9) { band = "B"; note = "consider dose reduction / increased monitoring"; }
  else if (p >= 10) { band = "C"; note = "avoid hepatically-cleared drugs if possible"; }
  return { band, note };
}
register({
  id: "hepatic_dose_flags",
  label: "Hepatic dose flag (Child-Pugh)",
  inputs: [{ key: "child_pugh_points", required: true }],
  run: ({ child_pugh_points }) => {
    if (child_pugh_points == null) return null;
    const r = runHepaticDoseFlags({ child_pugh_points });
    return { id: "hepatic_dose_flags", label: "Hepatic impairment", notes: [`Child-Pugh ${r.band}`, r.note] };
  },
});
