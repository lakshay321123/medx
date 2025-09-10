import { register } from "../registry";

/**
 * ISTH overt DIC score (>=5 = overt DIC)
 * Platelets (x10^9/L): >100=0, 50–100=1, <50=2
 * PT prolongation (sec): <3=0, 3–6=1, >6=2
 * D-dimer (x ULN): <1=0, 1–3=2, >3=3
 * Fibrinogen (g/L): >=1.0=0, <1.0=1
 */
export function computeISTHDIC(params: {
  platelets_x10e9_L: number | null;
  pt_seconds_over_control: number | null;
  d_dimer_value: number | null;           // numeric D-dimer
  d_dimer_uln: number | null;             // lab ULN to compute multiples
  fibrinogen_g_L: number | null;
}) {
  const notes: string[] = [];
  let score = 0;

  const {
    platelets_x10e9_L,
    pt_seconds_over_control,
    d_dimer_value,
    d_dimer_uln,
    fibrinogen_g_L,
  } = params;

  if (
    platelets_x10e9_L == null ||
    pt_seconds_over_control == null ||
    d_dimer_value == null ||
    d_dimer_uln == null ||
    fibrinogen_g_L == null
  ) {
    return {
      score: null,
      interpretation: "insufficient_inputs",
      notes: ["Provide platelets, PT prolongation, D-dimer & ULN, fibrinogen."],
    };
  }

  // Platelets
  if (platelets_x10e9_L > 100) score += 0;
  else if (platelets_x10e9_L >= 50) score += 1;
  else score += 2;

  // PT prolongation
  if (pt_seconds_over_control < 3) score += 0;
  else if (pt_seconds_over_control <= 6) score += 1;
  else score += 2;

  // D-dimer multiples of ULN
  const ddMult = d_dimer_value / (d_dimer_uln || 1);
  if (ddMult < 1) score += 0;
  else if (ddMult <= 3) score += 2;
  else score += 3;

  // Fibrinogen
  if (fibrinogen_g_L < 1.0) score += 1;

  const interpretation = score >= 5 ? "overt_DIC" : "non_overt_or_unlikely";
  notes.push(`D-dimer xULN=${ddMult.toFixed(2)}`);
  return { score, interpretation, notes };
}

register({
  id: "isth_dic",
  label: "ISTH DIC score",
  inputs: [
    { key: "platelets_x10e9_L", required: true },
    { key: "pt_seconds_over_control", required: true },
    { key: "d_dimer_value", required: true },
    { key: "d_dimer_uln", required: true },
    { key: "fibrinogen_g_L", required: true },
  ],
  run: computeISTHDIC,
});
