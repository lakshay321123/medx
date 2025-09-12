import { register } from "../registry";

export type SIRSInputs = { temp_c: number; HR: number; RR: number; WBC: number };

export function calc_sirs(i: SIRSInputs): number {
  let s = 0;
  s += i.temp_c > 38 || i.temp_c < 36 ? 1 : 0;
  s += i.HR > 90 ? 1 : 0;
  s += i.RR > 20 ? 1 : 0;
  s += i.WBC > 12 || i.WBC < 4 ? 1 : 0;
  return s;
}

register({
  id: "sirs",
  label: "SIRS",
  inputs: [{ key: "temp_c", required: true }, { key: "HR", required: true }, { key: "RR", required: true }, { key: "WBC", required: true }],
  run: (args: SIRSInputs) => {
    if ([args.temp_c, args.HR, args.RR, args.WBC].some(v => v == null)) return null;
    const v = calc_sirs(args);
    const notes = v >= 2 ? ["SIRS present (≥2)"] : [];
    return { id: "sirs", label: "SIRS", value: v, unit: "criteria", precision: 0, notes };
  },
});

export default calc_sirs;
