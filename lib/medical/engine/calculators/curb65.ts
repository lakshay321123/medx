run: ({
  confusion,
  urea_mmol_l,
  resp_rate,
  sbp,
  dbp,
  age_years,
}: {
  confusion?: boolean;
  urea_mmol_l?: number;
  resp_rate?: number;
  sbp?: number;
  dbp?: number;
  age_years?: number;
}) => {
  const v = calc_curb65({ confusion, urea_mmol_l, resp_rate, sbp, dbp, age_years });
  return { id: "curb65", label: "CURB-65", value: v, unit: "score", precision: 0, notes: [] };
},
