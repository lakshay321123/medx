export function detectLifestyleQuery(text: string): boolean {
  if (process.env.LIFESTYLE_TIPS_ENABLED !== "true") return false;
  const re = /(healthy|immunity|fitness|wellness|diet|exercise|sleep|stress)/i;
  return re.test(text);
}

type TranslationMeta = { translation?: string };

export type LifestyleTips = {
  nutrition: string[];
  exercise: string[];
  stress: string[];
  references: string[];
  meta?: TranslationMeta;
};

export type LifestyleTipsResponse = {
  lifestyle: LifestyleTips;
  meta?: TranslationMeta;
};

export function getLifestyleTips(): LifestyleTipsResponse {
  return {
    lifestyle: {
      nutrition: ["Eat whole grains, fruits, vegetables"],
      exercise: ["150 min/week brisk walking"],
      stress: ["10 min meditation daily"],
      references: ["https://www.who.int/diet-physical-activity"],
    },
  };
}
