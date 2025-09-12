import { register } from "../registry";

export type qSOFAInputs = { rr: number; sbp: number; gcs: number };

export function calc_qsofa(i: qSOFAInputs): { score: number; high_risk: boolean } {
  let s = 0;
  if (i.rr >= 22) s++;
  if (i.sbp <= 100) s++;
  if (i.gcs < 15) s++;
  return { score: s, high_risk: s >= 2 };
}

register({
  id: "qsofa",
  label: "qSOFA",
  inputs: [
    { key: "rr", required: true },
    { key: "sbp", required: true },
    { key: "gcs", required: true },
  ],
  run: (args: qSOFAInputs) => {
    for (const k of ["rr", "sbp", "gcs"]) {
      if ((args as any)[k] == null) return null;
    }
    const r = calc_qsofa(args);
    const notes = r.high_risk ? ["High risk (≥2)"] : [];
    return { id: "qsofa", label: "qSOFA", value: r.score, unit: "criteria", precision: 0, notes, extra: r };
  },
});

export default calc_qsofa;
