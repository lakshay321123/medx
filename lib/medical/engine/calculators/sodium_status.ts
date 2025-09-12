import { register } from "../registry";

// Corrected Na for hyperglycemia (piecewise: 1.6/100 up to 400, then 2.4/100)
function correctedNa(Na: number, glucose_mgdl?: number) {
  if (glucose_mgdl == null) return Na;
  const excess = Math.max(0, glucose_mgdl - 100);
  const lowBand = Math.min(excess, 300);       // up to 400 mg/dL
  const highBand = Math.max(0, excess - 300);  // above 400 mg/dL
  return Na + 1.6 * (lowBand / 100) + 2.4 * (highBand / 100);
}

register({
  id: "sodium_status",
  label: "Sodium",
  inputs: [{ key: "Na", required: true }, { key: "glucose_mgdl" }],
  run: ({ Na, glucose_mgdl }) => {
    if (Na == null) return null;
    const corr = correctedNa(Na, glucose_mgdl);
    const notes: string[] = [];
    const val = Math.round(corr * 10) / 10;

    // Classify on corrected Na (translocational if raw <135 but corrected ≥135)
    if (Na < 135 && corr >= 135) notes.push("translocational hyponatremia (hyperglycemia)");
    if (val < 120) notes.push("severe hyponatremia");
    else if (val < 130) notes.push("moderate hyponatremia");
    else if (val < 135) notes.push("mild hyponatremia");
    else if (val > 145) notes.push("hypernatremia");
    else notes.push("normal (corrected)");

    return { id: "sodium_status", label: "Sodium", value: val, unit: "mmol/L", precision: 1, notes };
  },
});
