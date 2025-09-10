import { register } from "../registry";

/**
 * Alvarado Score (appendicitis)
 * Migration (1), Anorexia (1), N/V (1), RLQ tenderness (2), Rebound (1),
 * Temp ≥37.5°C (1), Leukocytosis >10 (2), Left shift (1)
 */
export function calc_alvarado({
  migration_rlq, anorexia, nausea_vomiting, rlq_tenderness, rebound_pain, temp_c, wbc_k, left_shift
}: {
  migration_rlq?: boolean,
  anorexia?: boolean,
  nausea_vomiting?: boolean,
  rlq_tenderness?: boolean,
  rebound_pain?: boolean,
  temp_c?: number,
  wbc_k?: number, // in thousands/µL
  left_shift?: boolean
}) {
  let s = 0;
  if (migration_rlq) s += 1;
  if (anorexia) s += 1;
  if (nausea_vomiting) s += 1;
  if (rlq_tenderness) s += 2;
  if (rebound_pain) s += 1;
  if ((temp_c ?? 0) >= 37.5) s += 1;
  if ((wbc_k ?? 0) > 10) s += 2;
  if (left_shift) s += 1;
  return s;
}

register({
  id: "alvarado",
  label: "Alvarado Score (Appendicitis)",
  tags: ["surgery", "emergency"],
  inputs: [
    { key: "migration_rlq" },
    { key: "anorexia" },
    { key: "nausea_vomiting" },
    { key: "rlq_tenderness" },
    { key: "rebound_pain" },
    { key: "temp_c" },
    { key: "wbc_k" },
    { key: "left_shift" }
  ],
  run: ({
    migration_rlq, anorexia, nausea_vomiting, rlq_tenderness, rebound_pain, temp_c, wbc_k, left_shift
  }: {
    migration_rlq?: boolean;
    anorexia?: boolean;
    nausea_vomiting?: boolean;
    rlq_tenderness?: boolean;
    rebound_pain?: boolean;
    temp_c?: number;
    wbc_k?: number;
    left_shift?: boolean;
  }) => {
    const v = calc_alvarado({ migration_rlq, anorexia, nausea_vomiting, rlq_tenderness, rebound_pain, temp_c, wbc_k, left_shift });
    return { id: "alvarado", label: "Alvarado Score (Appendicitis)", value: v, unit: "score", precision: 0, notes: [] };
  },
});
