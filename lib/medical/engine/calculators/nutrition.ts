import { register } from "../registry";

/* ================== Nutrition & Metabolism ================== */

register({
  id: "bmi_calc",
  label: "Body Mass Index",
  tags: ["nutrition","metabolism"],
  inputs: [{ key: "weight_kg", required: true }, { key: "height_cm", required: true }],
  run: ({ weight_kg, height_cm }) => {
    if (height_cm <= 0) return null;
    const bmi = weight_kg / Math.pow(height_cm/100, 2);
    let band = "normal";
    if (bmi < 18.5) band = "underweight";
    else if (bmi >= 25 && bmi < 30) band = "overweight";
    else if (bmi >= 30) band = "obese";
    return { id: "bmi_calc", label: "Body Mass Index", value: bmi, unit: "kg/m²", precision: 1, notes: [band] };
  }
});

register({
  id: "mifflin_st_jeor_bmr",
  label: "Mifflin–St Jeor BMR",
  tags: ["nutrition","metabolism"],
  inputs: [
    { key: "sex", required: true }, { key: "age", required: true },
    { key: "weight_kg", required: true }, { key: "height_cm", required: true }
  ],
  run: ({ sex, age, weight_kg, height_cm }) => {
    const base = (sex?.toLowerCase?.() === "male")
      ? 10*weight_kg + 6.25*height_cm - 5*age + 5
      : 10*weight_kg + 6.25*height_cm - 5*age - 161;
    return { id: "mifflin_st_jeor_bmr", label: "Mifflin–St Jeor BMR", value: base, unit: "kcal/day", precision: 0, notes: [] };
  }
});

register({
  id: "total_energy_expenditure",
  label: "Total energy expenditure (TEE)",
  tags: ["nutrition","metabolism"],
  inputs: [{ key:"bmr", required:true }, { key:"activity_factor", required:true }],
  run: ({ bmr, activity_factor }) => {
    const tee = bmr * activity_factor;
    return { id: "total_energy_expenditure", label: "Total energy expenditure (TEE)", value: tee, unit: "kcal/day", precision: 0, notes: [] };
  }
});

register({
  id: "protein_goal_icu",
  label: "Protein goal (ICU general)",
  tags: ["nutrition","icu"],
  inputs: [{ key:"weight_kg", required:true }, { key:"severity", required:false }],
  run: ({ weight_kg, severity="standard" }) => {
    // 1.2–2.0 g/kg/day typical; choose 1.5 as center
    const perkg = severity==="severe" ? 2.0 : severity==="mild" ? 1.2 : 1.5;
    const grams = perkg * weight_kg;
    return { id: "protein_goal_icu", label: "Protein goal (ICU general)", value: grams, unit: "g/day", precision: 0, notes: [`${perkg} g/kg/day`] };
  }
});

register({
  id: "nitrogen_balance",
  label: "Nitrogen balance",
  tags: ["nutrition","metabolism"],
  inputs: [
    { key: "protein_g", required: true }, { key: "urea_nitrogen_g", required: true }
  ],
  run: ({ protein_g, urea_nitrogen_g }) => {
    const intake = protein_g / 6.25;
    const balance = intake - urea_nitrogen_g;
    const notes = [balance > 0 ? "anabolic" : balance < 0 ? "catabolic" : "neutral"];
    return { id: "nitrogen_balance", label: "Nitrogen balance", value: balance, unit: "g N/day", precision: 1, notes };
  }
});
