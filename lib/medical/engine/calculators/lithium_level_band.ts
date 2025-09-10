
import { register } from "../registry";
export interface LithiumInput { lithium_meq_l: number; }
export interface LithiumResult { band: "subtherapeutic" | "therapeutic" | "high" | "toxic"; }
export function runLithiumBand(i: LithiumInput): LithiumResult {
  const x = i.lithium_meq_l;
  let band: LithiumResult["band"] = "subtherapeutic";
  if (x >= 0.6 && x <= 1.2) band = "therapeutic";
  else if (x > 1.2 && x < 1.5) band = "high";
  else if (x >= 1.5) band = "toxic";
  return { band };
}
register({
  id: "lithium_level_band",
  label: "Lithium level band",
  inputs: [{ key: "lithium_meq_l", required: true }],
  run: ({ lithium_meq_l }) => {
    if (lithium_meq_l == null) return null;
    const r = runLithiumBand({ lithium_meq_l });
    return { id: "lithium_level_band", label: "Lithium", value: lithium_meq_l, unit: "mEq/L", notes: [r.band], precision: 2 };
  },
});
