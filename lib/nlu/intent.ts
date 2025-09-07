export type Intent =
  | "diet_plan" | "workout_plan" | "bmi_calc" | "trials_query" | "general_help";

export type Entities = {
  weightKg?: number;
  heightCm?: number;
  dietType?: "veg" | "non-veg" | "mixed";
  goal?: "fat_loss" | "muscle_gain" | "recomp";
};

export function parseIntentAndEntities(text: string): { intent: Intent; entities: Entities } {
  const t = text.toLowerCase();

  const intent: Intent =
    /bmi|body mass/.test(t) ? "bmi_calc" :
    /trial|nsclc|phase|recruiting/.test(t) ? "trials_query" :
    /workout|exercise|gym|training/.test(t) ? "workout_plan" :
    /diet|meal|protein|calorie|food/.test(t) ? "diet_plan" :
    "general_help";

  const entities: Entities = {};
  const kg = t.match(/(\d+)\s?kg/);
  if (kg) entities.weightKg = parseInt(kg[1], 10);

  const cm = t.match(/(\d+)\s?cm/);
  if (cm) entities.heightCm = parseInt(cm[1], 10);

  if (/\bveg\b/.test(t)) entities.dietType = "veg";
  if (/\bnon[-\s]?veg\b|chicken|fish|egg/.test(t)) entities.dietType = "non-veg";
  if (/mixed/.test(t)) entities.dietType = "mixed";

  if (/muscle|bulk|gain/.test(t)) entities.goal = "muscle_gain";
  if (/fat|weight.*loss|cut/.test(t)) entities.goal = "fat_loss";
  if (/recomp|both/.test(t)) entities.goal = "recomp";

  return { intent, entities };
}

