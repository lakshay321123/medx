import { register } from "../registry";

register({
  id: "egfr_ckd_epi",
  label: "eGFR (CKD-EPI)",
  inputs: [
    { key: "creatinine", required: true },
    { key: "age", required: true },
    { key: "sex", required: true },
  ],
  run: ({ creatinine, age, sex }) => {
    if (creatinine == null || age == null || !sex) return null;
    const k = sex === "female" ? 0.7 : 0.9;
    const a = sex === "female" ? -0.329 : -0.411;
    const scr = creatinine / k;
    const egfr =
      141 * Math.min(scr, 1) ** a * Math.max(scr, 1) ** -1.209 * 0.993 ** age * (sex === "female" ? 1.018 : 1);
    return { id: "egfr_ckd_epi", label: "eGFR (CKD-EPI)", value: egfr, unit: "mL/min/1.73m²", precision: 0 };
  },
});

register({
  id: "crcl_cg",
  label: "CrCl (Cockcroft–Gault)",
  inputs: [
    { key: "creatinine", required: true },
    { key: "age", required: true },
    { key: "weight_kg", required: true },
    { key: "sex", required: true },
  ],
  run: ({ creatinine, age, weight_kg, sex }) => {
    if (creatinine == null || age == null || weight_kg == null || !sex) return null;
    const factor = sex === "female" ? 0.85 : 1;
    const val = ((140 - age) * weight_kg * factor) / (72 * creatinine);
    return { id: "crcl_cg", label: "CrCl (Cockcroft–Gault)", value: val, unit: "mL/min", precision: 0 };
  },
});
