
import { register } from "../registry";

export type BMIInputs = { weight_kg: number, height_cm: number };
export function runBMI({ weight_kg, height_cm }: BMIInputs) {
  if ([weight_kg, height_cm].some(v => v==null || !isFinite(v as number))) return null;
  if (weight_kg<=0 || height_cm<=0) return null;
  const h_m = height_cm/100;
  const bmi = Number((weight_kg/(h_m*h_m)).toFixed(1));
  let category = "Underweight";
  if (bmi >= 18.5 && bmi < 25) category = "Normal";
  else if (bmi >= 25 && bmi < 30) category = "Overweight";
  else if (bmi >= 30) category = "Obesity";
  return { bmi, category };
}

export type MSJInputs = { sex: "M"|"F", weight_kg: number, height_cm: number, age_y: number };
export function runMifflin({ sex, weight_kg, height_cm, age_y }: MSJInputs) {
  if (!sex || [weight_kg,height_cm,age_y].some(v=>v==null || !isFinite(v as number))) return null;
  const base = 10*weight_kg + 6.25*height_cm - 5*age_y + (sex==="M"?5:-161);
  return { bmr: Math.round(base) };
}

export function runHarrisBenedict({ sex, weight_kg, height_cm, age_y }: MSJInputs) {
  if (!sex || [weight_kg,height_cm,age_y].some(v=>v==null || !isFinite(v as number))) return null;
  let bmr: number;
  if (sex==="M") bmr = 66.47 + 13.75*weight_kg + 5.003*height_cm - 6.755*age_y;
  else bmr = 655.1 + 9.563*weight_kg + 1.850*height_cm - 4.676*age_y;
  return { bmr: Math.round(bmr) };
}

// Penn State REE (ventilated)
export type PennStateInputs = { msj_bmr: number, VE_L_min: number, Tmax_C: number, age_y: number, bmi?: number };
export function runPennState({ msj_bmr, VE_L_min, Tmax_C, age_y, bmi }: PennStateInputs) {
  if ([msj_bmr,VE_L_min,Tmax_C,age_y].some(v=>v==null || !isFinite(v as number))) return null;
  const psu2003b = 0.96*msj_bmr + 31*VE_L_min + 167*Tmax_C - 6212;
  const psu2010  = 0.71*msj_bmr + 64*VE_L_min + 85*Tmax_C - 3085;
  const pick2010 = (age_y>=60 && (bmi!=null && bmi>=30));
  const preferred = pick2010 ? psu2010 : psu2003b;
  return { psu2003b: Math.round(psu2003b), psu2010: Math.round(psu2010), preferred: Math.round(preferred) };
}

export type TEEInputs = { bmr: number, activity_factor: number };
export function runTEE({ bmr, activity_factor }: TEEInputs) {
  if ([bmr,activity_factor].some(v=>v==null || !isFinite(v as number))) return null;
  return { tee: Math.round(bmr * activity_factor) };
}

export type ProteinInputs = { weight_kg: number, bmi?: number };
export function runProteinGoals({ weight_kg, bmi }: ProteinInputs) {
  if (weight_kg==null || !isFinite(weight_kg) || weight_kg<=0) return null;
  let min = 1.3, max = 2.0;
  if (bmi!=null) {
    if (bmi>=30 && bmi<40) { min = 1.5; max = 2.0; }
    else if (bmi>=40) { min = 2.0; max = 2.5; }
  }
  return { grams_per_day_low: Math.round(min*weight_kg), grams_per_day_high: Math.round(max*weight_kg) };
}

export type NBInputs = { protein_g_day: number, UUN_g_day: number };
export function runNitrogenBalance({ protein_g_day, UUN_g_day }: NBInputs) {
  if ([protein_g_day,UUN_g_day].some(v=>v==null || !isFinite(v as number))) return null;
  const Nintake = protein_g_day/6.25;
  const NB = Nintake - (UUN_g_day + 4);
  return { nitrogen_balance: Number(NB.toFixed(2)) };
}

export type GIRInputs = { rate_mL_h: number, dextrose_percent: number, weight_kg: number };
export function runGIR({ rate_mL_h, dextrose_percent, weight_kg }: GIRInputs) {
  if ([rate_mL_h,dextrose_percent,weight_kg].some(v=>v==null || !isFinite(v as number))) return null;
  if (rate_mL_h<0 || dextrose_percent<0 || weight_kg<=0) return null;
  const gir = (rate_mL_h * (dextrose_percent/100) * (1000/60)) / weight_kg; // mg/kg/min
  return { mg_per_kg_min: Number(gir.toFixed(2)) };
}

register({ id:"bmi", label:"BMI", inputs:[{key:"weight_kg",required:true},{key:"height_cm",required:true}], run: runBMI as any });
register({ id:"mifflin_st_jeor", label:"Mifflin-St Jeor BMR", inputs:[{key:"sex",required:true},{key:"weight_kg",required:true},{key:"height_cm",required:true},{key:"age_y",required:true}], run: runMifflin as any });
register({ id:"harris_benedict", label:"Harris-Benedict (classic)", inputs:[{key:"sex",required:true},{key:"weight_kg",required:true},{key:"height_cm",required:true},{key:"age_y",required:true}], run: runHarrisBenedict as any });
register({ id:"penn_state_ree", label:"Penn State REE (ventilated)", inputs:[{key:"msj_bmr",required:true},{key:"VE_L_min",required:true},{key:"Tmax_C",required:true},{key:"age_y",required:true},{key:"bmi"}], run: runPennState as any });
register({ id:"tee_activity", label:"Total Energy Expenditure (BMR × activity)", inputs:[{key:"bmr",required:true},{key:"activity_factor",required:true}], run: runTEE as any });
register({ id:"protein_goals_icu", label:"Protein goals (ICU)", inputs:[{key:"weight_kg",required:true},{key:"bmi"}], run: runProteinGoals as any });
register({ id:"nitrogen_balance", label:"Nitrogen balance", inputs:[{key:"protein_g_day",required:true},{key:"UUN_g_day",required:true}], run: runNitrogenBalance as any });
register({ id:"glucose_infusion_rate", label:"Glucose infusion rate (GIR)", inputs:[{key:"rate_mL_h",required:true},{key:"dextrose_percent",required:true},{key:"weight_kg",required:true}], run: runGIR as any });
