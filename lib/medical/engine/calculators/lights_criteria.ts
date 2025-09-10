import { register } from "../registry";
/**
 * Light's Criteria for pleural effusion
 */
export function calc_lights_criteria({
  pleural_protein_g_dl, serum_protein_g_dl, pleural_ldh, serum_ldh, ldh_uln
}: {
  pleural_protein_g_dl: number,
  serum_protein_g_dl: number,
  pleural_ldh: number,
  serum_ldh: number,
  ldh_uln: number
}) {
  const protein_ratio = pleural_protein_g_dl / serum_protein_g_dl;
  const ldh_ratio = pleural_ldh / serum_ldh;
  const ldh_cutoff = (2/3) * ldh_uln;
  const c1 = protein_ratio > 0.5;
  const c2 = ldh_ratio > 0.6;
  const c3 = pleural_ldh > ldh_cutoff;
  return { protein_ratio, ldh_ratio, ldh_cutoff, exudate: (c1 || c2 || c3), criteria: { c1, c2, c3 } };
}

register({
  id: "lights_criteria",
  label: "Light's Criteria",
  tags: ["pulmonology"],
  inputs: [
    { key: "pleural_protein_g_dl", required: true },
    { key: "serum_protein_g_dl", required: true },
    { key: "pleural_ldh", required: true },
    { key: "serum_ldh", required: true },
    { key: "ldh_uln", required: true }
  ],
  run: (ctx) => {
    const r = calc_lights_criteria(ctx);
    const notes = [r.exudate ? "exudate" : "transudate"];
    return { id: "lights_criteria", label: "Light's Criteria", value: r.exudate ? 1 : 0, unit: "flag", precision: 0, notes, extra: r };
  },
});
