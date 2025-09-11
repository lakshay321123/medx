export type LACEInputs = {
  length_of_stay_days: number;
  acute_admission: boolean;
  charlson_index: number;
  ed_visits_past_6mo: number;
};

function points_los(d: number): number {
  if (d <= 0) return 0;
  if (d == 1) return 1;
  if (d == 2) return 2;
  if (d == 3) return 3;
  if (d <= 6) return 4;
  if (d <= 13) return 5;
  return 7;
}
function points_charlson(c: number): number {
  if (c <= 0) return 0;
  if (c == 1) return 1;
  if (c == 2) return 2;
  if (c == 3) return 3;
  if (c == 4) return 4;
  return 5;
}
function points_ed(v: number): number {
  if (v <= 0) return 0;
  if (v == 1) return 1;
  if (v == 2) return 2;
  if (v == 3) return 3;
  return 4;
}

export function calc_lace(i: LACEInputs): number {
  return points_los(i.length_of_stay_days) + (i.acute_admission ? 3 : 0) + points_charlson(i.charlson_index) + points_ed(i.ed_visits_past_6mo);
}

const def = {
  id: "lace",
  label: "LACE Index (30-day readmission risk)",
  inputs: [
    { id: "length_of_stay_days", label: "Length of stay (days)", type: "number", min: 0 },
    { id: "acute_admission", label: "Acute admission via ED", type: "boolean" },
    { id: "charlson_index", label: "Charlson Comorbidity Index", type: "number", min: 0 },
    { id: "ed_visits_past_6mo", label: "ED visits in past 6 months", type: "number", min: 0 }
  ],
  run: (args: LACEInputs) => {
    const v = calc_lace(args);
    return { id: "lace", label: "LACE Index", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
