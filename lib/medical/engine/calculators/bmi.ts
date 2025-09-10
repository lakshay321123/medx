/**
 * Body Mass Index (kg/m^2) and WHO band
 */
export interface BMIInput { weight_kg: number; height_cm: number; }
export interface BMIResult { bmi: number; band: "underweight" | "normal" | "overweight" | "obesity" | "severe_obesity"; }
export function runBMI(i: BMIInput): BMIResult {
  const m = i.height_cm / 100;
  const bmi = i.weight_kg / (m*m);
  let band: BMIResult["band"] = "normal";
  if (bmi < 18.5) band = "underweight";
  else if (bmi < 25) band = "normal";
  else if (bmi < 30) band = "overweight";
  else if (bmi < 35) band = "obesity";
  else band = "severe_obesity";
  return { bmi, band };
}
