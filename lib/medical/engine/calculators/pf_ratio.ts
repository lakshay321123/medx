import { register } from "../registry";

/**
 * P/F Ratio = PaO2 / FiO2
 */
export function calc_pf_ratio({
  pao2, fio2
}: {
  pao2: number,
  fio2: number
}) {
  const ratio = pao2 / fio2;
  let band = "normal";
  if (ratio < 100) band = "severe ARDS range";
  else if (ratio < 200) band = "moderate ARDS range";
  else if (ratio < 300) band = "mild ARDS range";
  return { ratio, band };
}

register({
  id: "pf_ratio",
  label: "P/F Ratio",
  tags: ["pulmonology", "critical care"],
  inputs: [
    { key: "pao2", required: true },
    { key: "fio2", required: true }
  ],
  run: ({ pao2, fio2 }: { pao2: number; fio2: number; }) => {
    const r = calc_pf_ratio({ pao2, fio2 });
    const notes = [r.band];
    return { id: "pf_ratio", label: "P/F Ratio", value: r.ratio, unit: "", precision: 0, notes, extra: r };
  },
});
