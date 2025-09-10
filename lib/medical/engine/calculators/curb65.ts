import { register } from "../registry";

/**
 * CURB-65
 */
export function calc_curb65({
  confusion, urea_mmol_l, resp_rate, sbp, dbp, age_years
}: {
  confusion?: boolean,
  urea_mmol_l?: number,
  resp_rate?: number,
  sbp?: number,
  dbp?: number,
  age_years?: number
}) {
  let s = 0;
  if (confusion) s += 1;
  if ((urea_mmol_l ?? 0) > 7) s += 1;
  if ((resp_rate ?? 0) >= 30) s += 1;
  const lowBP = ((sbp ?? 200) < 90) || ((dbp ?? 200) <= 60);
  if (lowBP) s += 1;
  if ((age_years ?? 0) >= 65) s += 1;
  return s;
}

register({
  id: "curb65",
  label: "CURB-65",
  tags: ["pulmonology", "infectious disease"],
  inputs: [
    { key: "confusion" },
    { key: "urea_mmol_l" },
    { key: "resp_rate" },
    { key: "sbp" },
    { key: "dbp" },
    { key: "age_years" }
  ],
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
});
