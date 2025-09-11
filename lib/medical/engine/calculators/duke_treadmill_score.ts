// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type DukeTreadmillInputs = { exercise_time_min: number; st_deviation_mm: number; angina_index: 0|1|2 };

export function calc_duke_treadmill({ exercise_time_min, st_deviation_mm, angina_index }: DukeTreadmillInputs): number {
  return exercise_time_min - 5 * st_deviation_mm - 4 * angina_index;
}

const def = {
  id: "duke_treadmill_score",
  label: "Duke Treadmill Score",
  inputs: [
    { id: "exercise_time_min", label: "Exercise time (min)", type: "number", min: 0 },
    { id: "st_deviation_mm", label: "ST deviation (mm)", type: "number", min: 0 },
    { id: "angina_index", label: "Angina index (0 none, 1 non-limiting, 2 limiting)", type: "number", min: 0, max: 2, step: 1 }
  ],
  run: (args: DukeTreadmillInputs) => {
    const v = calc_duke_treadmill(args);
    return { id: "duke_treadmill_score", label: "Duke Treadmill Score", value: v, unit: "score", precision: 1, notes: [] };
  },
};

export default def;
