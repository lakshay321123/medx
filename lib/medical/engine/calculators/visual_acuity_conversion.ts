
import { register } from "../registry";
export interface VAInput { snellen_num: number; snellen_den: number; }
export interface VAResult { decimal: number; logMAR: number; }
export function runVAConvert(i: VAInput): VAResult {
  const dec = i.snellen_num / i.snellen_den;
  const logMAR = -Math.log10(dec);
  return { decimal: Number(dec.toFixed(2)), logMAR: Number(logMAR.toFixed(2)) };
}
register({
  id: "visual_acuity_conversion",
  label: "Visual acuity (Snellen→decimal/logMAR)",
  inputs: [{ key: "snellen_num", required: true }, { key: "snellen_den", required: true }],
  run: ({ snellen_num, snellen_den }) => {
    if (snellen_num == null || snellen_den == null) return null;
    const r = runVAConvert({ snellen_num, snellen_den });
    return { id: "visual_acuity_conversion", label: "VA", value: r.decimal, unit: "decimal", notes: [`logMAR ${r.logMAR}`], precision: 2 };
  },
});
