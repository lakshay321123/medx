// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type BMIInputs = {
  height_cm: number;
  weight_kg: number;
};

export function calc_bmi({ height_cm, weight_kg }: BMIInputs): number {
  const m = height_cm / 100;
  if (m <= 0) return NaN;
  return weight_kg / (m*m);
}

const def = {
  id: "bmi",
  label: "Body Mass Index (BMI)",
  inputs: [
    { id: "height_cm", label: "Height (cm)", type: "number", min: 30, max: 250 },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 }
  ],
  run: (args: BMIInputs) => {
    const v = calc_bmi(args);
    const notes = [v < 18.5 ? "underweight" : v < 25 ? "normal" : v < 30 ? "overweight" : "obesity"];
    return { id: "bmi", label: "BMI", value: v, unit: "kg/m²", precision: 1, notes };
  },
};

export default def;
