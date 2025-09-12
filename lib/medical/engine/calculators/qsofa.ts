import { register } from "../registry";

export type qSOFAInputs = { RR: number; SBP: number; consciousness: string };

export function calc_qsofa(i: qSOFAInputs): { score: number; high_risk: boolean } {
  let s = 0;
  if (i.RR >= 22) s++;
  if (i.SBP <= 100) s++;
  if (i.consciousness !== "alert") s++;
  return { score: s, high_risk: s >= 2 };
}

register({
  id: "qsofa",
  label: "qSOFA",
  inputs: [{ key: "RR", required: true }, { key: "SBP", required: true }, { key: "consciousness", required: true }],
  run: (args: qSOFAInputs) => {
    if ([args.RR, args.SBP, args.consciousness].some((v) => v == null)) return null;
    const r = calc_qsofa(args);
    const notes = r.high_risk ? ["High risk (≥2)"] : [];
    return { id: "qsofa", label: "qSOFA", value: r.score, unit: "criteria", precision: 0, notes, extra: r };
  },
});

export default calc_qsofa;
