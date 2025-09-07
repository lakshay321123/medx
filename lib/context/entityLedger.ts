export type EntityLedger = {
  person?: {
    age?: number;
    sex?: "male" | "female" | "other";
    heightCm?: number;
    weightKg?: number;
    activity?: "sedentary" | "light" | "moderate" | "active" | "athlete";
    locationCountry?: string;
    dietaryPref?: "veg" | "nonveg" | "mixed" | "vegan" | "none";
    goals?: string[];
  };
};

export function parseEntitiesFromText(text: string): EntityLedger {
  const s = text.toLowerCase();
  const out: EntityLedger = { person: {} };

  // height: 5.10, 5'10", 178 cm
  const feetIn = s.match(/(\d)\s*[\' ]\s*(\d{1,2})\s*("?|in|inch|inches)?/);
  const decFeet = s.match(/(\d)\.(\d{1,2})\s*(feet|foot|ft)?/);
  const cm = s.match(/(\d{3})\s*(cm|centimeter|centimeters)/);
  if (feetIn) {
    const ft = parseInt(feetIn[1], 10);
    const inch = parseInt(feetIn[2], 10);
    out.person!.heightCm = Math.round((ft * 12 + inch) * 2.54);
  } else if (decFeet) {
    const ft = parseInt(decFeet[1], 10);
    const dec = parseInt(decFeet[2], 10);
    const inches = Math.round((ft + dec / 10) * 12);
    out.person!.heightCm = Math.round(inches * 2.54);
  } else if (cm) {
    out.person!.heightCm = parseInt(cm[1], 10);
  }

  // weight: 80 kg, 176 lb
  const kg = s.match(/(\d{2,3})\s*(kg|kilogram|kilograms)/);
  const lb = s.match(/(\d{2,3})\s*(lb|lbs|pound|pounds)/);
  if (kg) out.person!.weightKg = parseInt(kg[1], 10);
  if (!kg && lb) out.person!.weightKg = Math.round(parseInt(lb[1], 10) * 0.453592);

  // sex
  if (s.includes(" male ")) out.person!.sex = "male";
  if (s.includes(" female ")) out.person!.sex = "female";

  // activity
  if (s.includes("sedentary")) out.person!.activity = "sedentary";
  if (s.includes("lightly active") || s.includes("light activity")) out.person!.activity = "light";
  if (s.includes("moderately active") || s.includes("moderate activity")) out.person!.activity = "moderate";
  if (s.includes("very active") || s.includes("hard exercise")) out.person!.activity = "active";
  if (s.includes("athlete")) out.person!.activity = "athlete";

  // diet pref
  if (s.includes("vegetarian") || s.includes("veg only")) out.person!.dietaryPref = "veg";
  if (s.includes("non-veg") || s.includes("non veg") || s.includes("nonveg")) out.person!.dietaryPref = "nonveg";
  if (s.includes("vegan")) out.person!.dietaryPref = "vegan";

  // location hint
  if (s.includes("india")) out.person!.locationCountry = "India";

  // goals
  const goals: string[] = [];
  if (s.includes("lose weight") || s.includes("fat loss")) goals.push("fat loss");
  if (s.includes("gain muscle") || s.includes("muscle gain")) goals.push("muscle gain");
  if (s.includes("abs")) goals.push("visible abs");
  if (goals.length) out.person!.goals = goals;

  // clean empty
  if (Object.values(out.person || {}).every((v) => v === undefined)) delete out.person;
  return out;
}

export function mergeEntityLedger(a?: EntityLedger, b?: EntityLedger): EntityLedger {
  return {
    person: {
      ...(a?.person || {}),
      ...(b?.person || {}),
      goals: Array.from(new Set([...(a?.person?.goals || []), ...(b?.person?.goals || [])])),
    },
  };
}
