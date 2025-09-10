import { register } from "../registry";

/**
 * Mean Arterial Pressure (MAP) = (SBP + 2*DBP) / 3
 */
export function calc_map({
  sbp, dbp
}: {
  sbp: number,
  dbp: number
}) {
  return (sbp + 2 * dbp) / 3;
}

register({
  id: "map",
  label: "Mean Arterial Pressure",
  tags: ["critical care", "hemodynamics"],
  inputs: [
    { key: "sbp", required: true },
    { key: "dbp", required: true }
  ],
  run: ({ sbp, dbp }: { sbp: number; dbp: number; }) => {
    const v = calc_map({ sbp, dbp });
    return { id: "map", label: "Mean Arterial Pressure", value: v, unit: "mmHg", precision: 0, notes: [] };
  },
});
