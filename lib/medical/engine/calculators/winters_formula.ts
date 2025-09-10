import { register } from "../registry";

/**
 * Winter's Formula: expected PaCO2 for metabolic acidosis
 * Expected PaCO2 ≈ 1.5*HCO3 + 8 (range ±2)
 */
export function calc_winters_formula({
  hco3, measured_paco2
}: {
  hco3: number,
  measured_paco2?: number
}) {
  const expected = 1.5 * hco3 + 8;
  const low = expected - 2;
  const high = expected + 2;
  let comment = "";
  if (measured_paco2 != null) {
    if (measured_paco2 < low) comment = "concurrent respiratory alkalosis";
    else if (measured_paco2 > high) comment = "concurrent respiratory acidosis";
    else comment = "appropriate compensation";
  }
  return { expected, low, high, comment };
}

register({
  id: "winters_formula",
  label: "Winter's Formula",
  tags: ["acid-base", "critical care"],
  inputs: [
    { key: "hco3", required: true },
    { key: "measured_paco2" }
  ],
  run: ({ hco3, measured_paco2 }: { hco3: number; measured_paco2?: number; }) => {
    const r = calc_winters_formula({ hco3, measured_paco2 });
    const notes = [r.comment || ""];
    return { id: "winters_formula", label: "Winter's Formula", value: r.expected, unit: "mmHg (expected PaCO2)", precision: 0, notes, extra: r };
  },
});
