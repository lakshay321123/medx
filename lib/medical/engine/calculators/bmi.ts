export type BMIInputs = { height_cm:number; weight_kg:number };

export function calc_bmi(i: BMIInputs): { bmi:number; category:"underweight"|"normal"|"overweight"|"obesity" } {
  const m = i.height_cm / 100;
  const bmi = i.weight_kg / (m*m);
  let category:"underweight"|"normal"|"overweight"|"obesity" = "normal";
  if (bmi < 18.5) category = "underweight";
  else if (bmi < 25) category = "normal";
  else if (bmi < 30) category = "overweight";
  else category = "obesity";
  return { bmi, category };
}

const def = {
  id: "bmi",
  label: "Body Mass Index",
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
