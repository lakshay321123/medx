import { register } from "../registry";
/**
 * MELD-Na (2016)
 */
export function calc_meld_na({
  creatinine_mg_dl, bilirubin_mg_dl, inr, sodium_mmol_l
}: {
  creatinine_mg_dl: number,
  bilirubin_mg_dl: number,
  inr: number,
  sodium_mmol_l: number
}) {
  const cr = Math.max(creatinine_mg_dl, 1.0);
  const bili = Math.max(bilirubin_mg_dl, 1.0);
  const _inr = Math.max(inr, 1.0);
  const meld = (0.957 * Math.log(cr) + 0.378 * Math.log(bili) + 1.120 * Math.log(_inr) + 0.643) * 10;
  const Na = Math.min(Math.max(sodium_mmol_l, 125), 137);
  const meldNa = Math.round(meld + 1.32 * (137 - Na) - 0.033 * meld * (137 - Na));
  return { meld, meldNa };
}

register({
  id: "meld_na",
  label: "MELD-Na",
  tags: ["hepatology"],
  inputs: [
    { key: "creatinine_mg_dl", required: true },
    { key: "bilirubin_mg_dl", required: true },
    { key: "inr", required: true },
    { key: "sodium_mmol_l", required: true }
  ],
  run: (ctx) => {
    const r = calc_meld_na(ctx);
    return { id: "meld_na", label: "MELD-Na", value: r.meldNa, unit: "score", precision: 0, notes: [], extra: r };
  },
});
