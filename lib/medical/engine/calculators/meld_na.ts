run: ({
  creatinine_mg_dl,
  bilirubin_mg_dl,
  inr,
  sodium_mmol_l,
}: {
  creatinine_mg_dl: number;
  bilirubin_mg_dl: number;
  inr: number;
  sodium_mmol_l: number;
}) => {
  const r = calc_meld_na({ creatinine_mg_dl, bilirubin_mg_dl, inr, sodium_mmol_l });
  return { id: "meld_na", label: "MELD-Na", value: r.meldNa, unit: "score", precision: 0, notes: [], extra: r };
},
