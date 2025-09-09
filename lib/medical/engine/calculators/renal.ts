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

// Simplified Phase-1 eGFR (placeholder)
register({
  id: "egfr_ckdepi_simplified",
  label: "eGFR (CKD-EPI, simplified)",
  inputs: [{ key: "creatinine", required: true }],
  run: ({ creatinine }) => {
    const cr = Math.max(0.1, creatinine!);
    const egfr = 80 * Math.pow(1 / cr, 1.1);
    return {
      id: "egfr_ckdepi_simplified",
      label: "eGFR (CKD-EPI, simplified)",
      value: egfr,
      unit: "mL/min/1.73m²",
      precision: 0,
      notes: ["Phase-1 placeholder"],
    };
  },
});

// FENa
register({
  id: "fena",
  label: "FENa",
  inputs: [
    { key: "urine_na", required: true },
    { key: "urine_cr", required: true },
    { key: "Na", required: true },
    { key: "creatinine", required: true },
  ],
  run: ({ urine_na, urine_cr, Na, creatinine }) => {
    if ([urine_na, urine_cr, Na, creatinine].some(v => v == null || v === 0)) return null;
    const val = (urine_na * creatinine) / (Na * urine_cr) * 100;
    const notes: string[] = [];
    if (val < 1) notes.push("prerenal likely");
    else if (val > 2) notes.push("intrinsic renal likely");
    return { id: "fena", label: "FENa", value: val, unit: "%", precision: 1, notes };
  },
});

// FEUrea
register({
  id: "feurea",
  label: "FEUrea",
  inputs: [
    { key: "urine_urea", required: true },
    { key: "urine_cr", required: true },
    { key: "BUN", required: true },
    { key: "creatinine", required: true },
  ],
  run: ({ urine_urea, urine_cr, BUN, creatinine }) => {
    if ([urine_urea, urine_cr, BUN, creatinine].some(v => v == null || v === 0)) return null;
    const val = (urine_urea * creatinine) / (BUN * urine_cr) * 100;
    const notes: string[] = [];
    if (val < 35) notes.push("prerenal (esp. on diuretics) likely");
    return { id: "feurea", label: "FEUrea", value: val, unit: "%", precision: 0, notes };
  },
});
