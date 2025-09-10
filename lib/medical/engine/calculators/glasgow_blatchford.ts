import { register } from "../registry";

/**
 * Glasgow-Blatchford Score (UGIB)
 * Inputs: bun_mg_dl, hb_g_dl, sex, sbp, pulse, melena, syncope, hepatic_disease, cardiac_failure
 */

function bunToPoints(bun_mg_dl: number): number {
  // Convert BUN mg/dL → mmol/L (approx 0.357) for original thresholds
  const mmol = bun_mg_dl * 0.357;
  if (mmol >= 25) return 6;
  if (mmol >= 10) return 4;
  if (mmol >= 8) return 3;
  if (mmol >= 6.5) return 2;
  return 0;
}

function hbToPoints(hb_g_dl: number, sex: "male" | "female"): number {
  if (sex === "male") {
    if (hb_g_dl < 12) return 6;
    if (hb_g_dl < 13) return 3;
    if (hb_g_dl < 14) return 1;
    return 0;
  } else {
    if (hb_g_dl < 11) return 6;
    if (hb_g_dl < 12) return 3;
    if (hb_g_dl < 13) return 1;
    return 0;
  }
}

function sbpToPoints(sbp: number): number {
  if (sbp < 90) return 3;
  if (sbp < 100) return 2;
  if (sbp < 110) return 1;
  return 0;
}

export function calc_glasgow_blatchford({
  bun_mg_dl,
  hb_g_dl,
  sex,
  sbp,
  pulse,
  melena,
  syncope,
  hepatic_disease,
  cardiac_failure,
}: {
  bun_mg_dl: number;
  hb_g_dl: number;
  sex: "male" | "female";
  sbp: number;
  pulse: number;
  melena?: boolean;
  syncope?: boolean;
  hepatic_disease?: boolean;
  cardiac_failure?: boolean;
}) {
  let s =
    bunToPoints(bun_mg_dl) + hbToPoints(hb_g_dl, sex) + sbpToPoints(sbp);
  if (pulse >= 100) s += 1;
  if (melena) s += 1;
  if (syncope) s += 2;
  if (hepatic_disease) s += 2;
  if (cardiac_failure) s += 2;
  return s;
}

register({
  id: "glasgow_blatchford",
  label: "Glasgow-Blatchford (UGIB)",
  tags: ["gi", "emergency"],
  inputs: [
    { key: "bun_mg_dl", required: true },
    { key: "hb_g_dl", required: true },
    { key: "sex", required: true },
    { key: "sbp", required: true },
    { key: "pulse", required: true },
    { key: "melena" },
    { key: "syncope" },
    { key: "hepatic_disease" },
    { key: "cardiac_failure" },
  ],
  run: ({
    bun_mg_dl,
    hb_g_dl,
    sex,
    sbp,
    pulse,
    melena,
    syncope,
    hepatic_disease,
    cardiac_failure,
  }: {
    bun_mg_dl: number;
    hb_g_dl: number;
    sex: "male" | "female";
    sbp: number;
    pulse: number;
    melena?: boolean;
    syncope?: boolean;
    hepatic_disease?: boolean;
    cardiac_failure?: boolean;
  }) => {
    const v = calc_glasgow_blatchford({
      bun_mg_dl,
      hb_g_dl,
      sex,
      sbp,
      pulse,
      melena,
      syncope,
      hepatic_disease,
      cardiac_failure,
    });
    return {
      id: "glasgow_blatchford",
      label: "Glasgow-Blatchford (UGIB)",
      value: v,
      unit: "score",
      precision: 0,
      notes: [],
    };
  },
});
