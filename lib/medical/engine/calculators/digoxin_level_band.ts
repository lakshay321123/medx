
import { register } from "../registry";
export interface DigoxinInput { digoxin_ng_ml: number; }
export interface DigoxinResult { band: "subtherapeutic" | "therapeutic" | "high" | "toxic"; }
export function runDigoxinBand(i: DigoxinInput): DigoxinResult {
  const x = i.digoxin_ng_ml;
  let band: DigoxinResult["band"] = "subtherapeutic";
  if (x >= 0.5 && x <= 0.9) band = "therapeutic";
  else if (x > 0.9 && x < 2.0) band = "high";
  else if (x >= 2.0) band = "toxic";
  return { band };
}
register({
  id: "digoxin_level_band",
  label: "Digoxin level band",
  inputs: [{ key: "digoxin_ng_ml", required: true }],
  run: ({ digoxin_ng_ml }) => {
    if (digoxin_ng_ml == null) return null;
    const r = runDigoxinBand({ digoxin_ng_ml });
    return { id: "digoxin_level_band", label: "Digoxin", value: digoxin_ng_ml, unit: "ng/mL", notes: [r.band], precision: 2 };
  },
});
