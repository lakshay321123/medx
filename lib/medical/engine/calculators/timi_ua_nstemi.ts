import { register } from "../registry";

/**
 * TIMI Risk Score for UA/NSTEMI
 * One point each criterion (0–7 total)
 */
export function calc_timi_ua_nstemi({
  age_ge_65,
  at_least_3_risk_factors,
  known_cad_stenosis_ge_50,
  aspirin_use_past_7d,
  severe_angina_recent,
  st_deviation_ge_0_5mm,
  elevated_markers
}: {
  age_ge_65?: boolean,
  at_least_3_risk_factors?: boolean,
  known_cad_stenosis_ge_50?: boolean,
  aspirin_use_past_7d?: boolean,
  severe_angina_recent?: boolean,
  st_deviation_ge_0_5mm?: boolean,
  elevated_markers?: boolean
}) {
  let s = 0;
  if (age_ge_65) s += 1;
  if (at_least_3_risk_factors) s += 1;
  if (known_cad_stenosis_ge_50) s += 1;
  if (aspirin_use_past_7d) s += 1;
  if (severe_angina_recent) s += 1;
  if (st_deviation_ge_0_5mm) s += 1;
  if (elevated_markers) s += 1;
  return s;
}

register({
  id: "timi_ua_nstemi",
  label: "TIMI (UA/NSTEMI)",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "age_ge_65" },
    { key: "at_least_3_risk_factors" },
    { key: "known_cad_stenosis_ge_50" },
    { key: "aspirin_use_past_7d" },
    { key: "severe_angina_recent" },
    { key: "st_deviation_ge_0_5mm" },
    { key: "elevated_markers" }
  ],
  run: (ctx: {
    age_ge_65?: boolean;
    at_least_3_risk_factors?: boolean;
    known_cad_stenosis_ge_50?: boolean;
    aspirin_use_past_7d?: boolean;
    severe_angina_recent?: boolean;
    st_deviation_ge_0_5mm?: boolean;
    elevated_markers?: boolean;
  }) => {
    const v = calc_timi_ua_nstemi(ctx);
    return { id: "timi_ua_nstemi", label: "TIMI (UA/NSTEMI)", value: v, unit: "score", precision: 0, notes: [] };
  },
});
