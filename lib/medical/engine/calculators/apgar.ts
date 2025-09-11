export type ApgarInputs = {
  appearance: 0|1|2;   // skin color
  pulse: 0|1|2;        // heart rate
  grimace: 0|1|2;      // reflex irritability
  activity: 0|1|2;     // muscle tone
  respiration: 0|1|2;  // respiratory effort
};

export function calc_apgar(i: ApgarInputs): { score:number; category:"normal"|"moderately depressed"|"severely depressed" } {
  const s = i.appearance + i.pulse + i.grimace + i.activity + i.respiration;
  let category:"normal"|"moderately depressed"|"severely depressed" = "normal";
  if (s <= 3) category = "severely depressed";
  else if (s <= 6) category = "moderately depressed";
  return { score: s, category };
}

const def = {
  id: "apgar",
  label: "APGAR Score",
  inputs: [
    { id: "appearance", label: "Appearance (0–2)", type: "number", min: 0, max: 2 },
    { id: "pulse", label: "Pulse (0–2)", type: "number", min: 0, max: 2 },
    { id: "grimace", label: "Grimace (0–2)", type: "number", min: 0, max: 2 },
    { id: "activity", label: "Activity (0–2)", type: "number", min: 0, max: 2 },
    { id: "respiration", label: "Respiration (0–2)", type: "number", min: 0, max: 2 }
  ],
  run: (args: ApgarInputs) => {
    const r = calc_apgar(args);
    const notes = [r.category];
    return { id: "apgar", label: "APGAR", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};
export default def;
