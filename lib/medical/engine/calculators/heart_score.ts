import { register } from "../registry";

/**
 * HEART Score for Chest Pain
 * Components 0–2 each: History, ECG, Age, Risk factors, Troponin (x ULN)
 */
export function calc_heart_score({
  history_level,
  ecg_level,
  age_years,
  risk_factors_count,
  known_atherosclerosis,
  troponin_multiple_uln
}: {
  history_level: 0 | 1 | 2,
  ecg_level: 0 | 1 | 2,
  age_years: number,
  risk_factors_count?: number,
  known_atherosclerosis?: boolean,
  troponin_multiple_uln: number
}) {
  let agePts = 0;
  if (age_years >= 65) agePts = 2;
  else if (age_years >= 45) agePts = 1;

  const rfCount = (risk_factors_count ?? 0) + ((known_atherosclerosis ?? false) ? 3 : 0);
  let rfPts = 0;
  if (rfCount >= 3) rfPts = 2;
  else if (rfCount >= 1) rfPts = 1;

  let troponinPts = 0;
  if (troponin_multiple_uln > 3) troponinPts = 2;
  else if (troponin_multiple_uln > 1) troponinPts = 1;

  const total = history_level + ecg_level + agePts + rfPts + troponinPts;
  let risk = "low";
  if (total >= 7) risk = "high";
  else if (total >= 4) risk = "intermediate";
  return { total, risk };
}

register({
  id: "heart_score",
  label: "HEART Score",
  tags: ["cardiology", "emergency"],
  inputs: [
    { key: "history_level", required: true },
    { key: "ecg_level", required: true },
    { key: "age_years", required: true },
    { key: "risk_factors_count" },
    { key: "known_atherosclerosis" },
    { key: "troponin_multiple_uln", required: true }
  ],
  run: ({
    history_level,
    ecg_level,
    age_years,
    risk_factors_count,
    known_atherosclerosis,
    troponin_multiple_uln,
  }: {
    history_level: 0 | 1 | 2;
    ecg_level: 0 | 1 | 2;
    age_years: number;
    risk_factors_count?: number;
    known_atherosclerosis?: boolean;
    troponin_multiple_uln: number;
  }) => {
    const r = calc_heart_score({ history_level, ecg_level, age_years, risk_factors_count, known_atherosclerosis, troponin_multiple_uln });
    const notes = [`risk ${r.risk}`];
    return { id: "heart_score", label: "HEART Score", value: r.total, unit: "score", precision: 0, notes, extra: r };
  },
});
