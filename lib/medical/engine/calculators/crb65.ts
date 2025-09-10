import { register } from "../registry";

/**
 * CRB-65 (no urea)
 */
export function calc_crb65({
  confusion, resp_rate, sbp, dbp, age_years
}: {
  confusion?: boolean,
  resp_rate?: number,
  sbp?: number,
  dbp?: number,
  age_years?: number
}) {
  let s = 0;
  if (confusion) s += 1;
  if ((resp_rate ?? 0) >= 30) s += 1;
  const lowBP = ((sbp ?? 200) < 90) || ((dbp ?? 200) <= 60);
  if (lowBP) s += 1;
  if ((age_years ?? 0) >= 65) s += 1;
  return s;
}

register({
  id: "crb65",
  label: "CRB-65",
  tags: ["pulmonology", "infectious disease"],
  inputs: [
    { key: "confusion" },
    { key: "resp_rate" },
    { key: "sbp" },
    { key: "dbp" },
    { key: "age_years" }
  ],
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
});
