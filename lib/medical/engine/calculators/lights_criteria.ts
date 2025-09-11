// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type LightsInputs = {
  pleural_protein_g_dl: number;
  serum_protein_g_dl: number;
  pleural_ldh_u_l: number;
  serum_ldh_u_l: number;
  serum_ldh_uln_u_l: number;
};

export function calc_lights_criteria(i: LightsInputs): { exudate: boolean; protein_ratio: number; ldh_ratio: number; ldh_gt_2_3_uln: boolean } {
  const protein_ratio = i.pleural_protein_g_dl / i.serum_protein_g_dl;
  const ldh_ratio = i.pleural_ldh_u_l / i.serum_ldh_u_l;
  const ldh_gt = i.pleural_ldh_u_l > (2/3) * i.serum_ldh_uln_u_l;
  const exudate = protein_ratio > 0.5 || ldh_ratio > 0.6 || ldh_gt;
  return { exudate, protein_ratio, ldh_ratio, ldh_gt_2_3_uln: ldh_gt };
}

const def = {
  id: "lights_criteria",
  label: "Light's Criteria (Pleural Fluid)",
  inputs: [
    { id: "pleural_protein_g_dl", label: "Pleural protein (g/dL)", type: "number", min: 0 },
    { id: "serum_protein_g_dl", label: "Serum protein (g/dL)", type: "number", min: 0 },
    { id: "pleural_ldh_u_l", label: "Pleural LDH (U/L)", type: "number", min: 0 },
    { id: "serum_ldh_u_l", label: "Serum LDH (U/L)", type: "number", min: 0 },
    { id: "serum_ldh_uln_u_l", label: "Serum LDH ULN (U/L)", type: "number", min: 0 }
  ],
  run: (args: LightsInputs) => {
    const r = calc_lights_criteria(args);
    const notes = [r.exudate ? "exudate" : "transudate"];
    return { id: "lights_criteria", label: "Light's Criteria", value: r.exudate ? 1 : 0, unit: "flag", precision: 0, notes, extra: r };
  },
};

export default def;
