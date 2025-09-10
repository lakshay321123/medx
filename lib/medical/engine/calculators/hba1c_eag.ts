import { register } from "../registry";
/**
 * eAG from HbA1c
 * mg/dL = 28.7*A1c − 46.7
 */
export function calc_eag_from_hba1c({ hba1c_percent }: { hba1c_percent: number }) {
  const mgdl = 28.7 * hba1c_percent - 46.7;
  const mmoll = mgdl / 18;
  return { mgdl, mmoll };
}

register({
  id: "hba1c_eag",
  label: "Estimated Avg Glucose (eAG)",
  tags: ["endocrine"],
  inputs: [{ key: "hba1c_percent", required: true }],
  run: ({ hba1c_percent }) => {
    const r = calc_eag_from_hba1c({ hba1c_percent });
    const notes = [`≈ ${Math.round(r.mmoll)} mmol/L`];
    return { id: "hba1c_eag", label: "Estimated Avg Glucose (eAG)", value: Math.round(r.mgdl), unit: "mg/dL", precision: 0, notes, extra: r };
  },
});
