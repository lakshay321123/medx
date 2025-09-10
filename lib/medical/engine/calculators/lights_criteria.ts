run: ({
  pleural_protein_g_dl,
  serum_protein_g_dl,
  pleural_ldh,
  serum_ldh,
  ldh_uln,
}: {
  pleural_protein_g_dl: number;
  serum_protein_g_dl: number;
  pleural_ldh: number;
  serum_ldh: number;
  ldh_uln: number;
}) => {
  const r = calc_lights_criteria({
    pleural_protein_g_dl,
    serum_protein_g_dl,
    pleural_ldh,
    serum_ldh,
    ldh_uln,
  });
  const notes = [r.exudate ? "exudate" : "transudate"];
  return { id: "lights_criteria", label: "Light's Criteria", value: r.exudate ? 1 : 0, unit: "flag", precision: 0, notes, extra: r };
},
