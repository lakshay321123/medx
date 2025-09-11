export type BMIInputs = { height_cm: number; weight_kg: number };

export function calc_bmi(i: BMIInputs): { bmi: number; category: "underweight"|"normal"|"overweight"|"obesity" } {
  const h_m = i.height_cm / 100;
  const bmi = i.weight_kg / (h_m*h_m);
  let cat: "underweight"|"normal"|"overweight"|"obesity" = "underweight";
  if (bmi < 18.5) cat = "underweight";
  else if (bmi < 25) cat = "normal";
  else if (bmi < 30) cat = "overweight";
  else cat = "obesity";
  return { bmi, category: cat };
}

const def = {
  id: "bmi",
  label: "Body Mass Index (BMI)",
  inputs: [
    { id: "height_cm", label: "Height (cm)", type: "number", min: 50, max: 250 },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 400 }
  ],
  run: (args: BMIInputs) => {
    const r = calc_bmi(args);
    const notes = [r.category];
    return { id: "bmi", label: "BMI", value: r.bmi, unit: "kg/m²", precision: 1, notes, extra: r };
  },
};

export default def;
