export type HEARTInputs = {
  history: 0|1|2;
  ecg: 0|1|2;
  age: 0|1|2;
  risk_factors: 0|1|2;
  troponin: 0|1|2;
};

export function calc_heart_score(i: HEARTInputs): { score:number; risk:"low"|"intermediate"|"high" } {
  const s = i.history + i.ecg + i.age + i.risk_factors + i.troponin;
  let risk:"low"|"intermediate"|"high" = "low";
  if (s >= 7) risk = "high";
  else if (s >= 4) risk = "intermediate";
  return { score: s, risk };
}

const def = {
  id: "heart_score",
  label: "HEART Score (chest pain)",
  inputs: [
    { id: "history", label: "History (0–2)", type: "number", min: 0, max: 2 },
    { id: "ecg", label: "ECG (0–2)", type: "number", min: 0, max: 2 },
    { id: "age", label: "Age (0–2)", type: "number", min: 0, max: 2 },
    { id: "risk_factors", label: "Risk factors (0–2)", type: "number", min: 0, max: 2 },
    { id: "troponin", label: "Troponin (0–2)", type: "number", min: 0, max: 2 }
  ],
  run: (args: HEARTInputs) => {
    const r = calc_heart_score(args);
    const notes = [r.risk];
    return { id: "heart_score", label: "HEART Score", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
