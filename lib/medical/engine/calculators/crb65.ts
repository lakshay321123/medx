run: ({
  confusion,
  resp_rate,
  sbp,
  dbp,
  age_years,
}: {
  confusion?: boolean;
  resp_rate?: number;
  sbp?: number;
  dbp?: number;
  age_years?: number;
}) => {
  const v = calc_crb65({ confusion, resp_rate, sbp, dbp, age_years });
  return { id: "crb65", label: "CRB-65", value: v, unit: "score", precision: 0, notes: [] };
},
