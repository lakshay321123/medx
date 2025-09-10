import { register } from "../registry";
/**
 * Corrected Calcium (mg/dL) = measured + 0.8*(4 - albumin)
 */
export function calc_corrected_calcium({ ca_mg_dl, albumin_g_dl }:
  { ca_mg_dl: number, albumin_g_dl: number }) {
  if (ca_mg_dl == null || albumin_g_dl == null) return null;
  return ca_mg_dl + 0.8 * (4 - albumin_g_dl);
}

register({
  id: "corrected_calcium",
  label: "Albumin-corrected Calcium",
  tags: ["electrolytes"],
  inputs: [
    { key: "ca_mg_dl", required: true },
    { key: "albumin_g_dl", required: true },
  ],
  run: ({ ca_mg_dl, albumin_g_dl }) => {
    const v = calc_corrected_calcium({ ca_mg_dl, albumin_g_dl });
    if (v == null) return null;
    const notes: string[] = [];
    if (v < 8.5) notes.push("hypocalcemia");
    else if (v > 10.5) notes.push("hypercalcemia");
    return { id: "corrected_calcium", label: "Albumin-corrected Calcium", value: v, unit: "mg/dL", precision: 1, notes };
  },
});
