export function detectLifestyleQuery(text: string): boolean {
  if (process.env.LIFESTYLE_TIPS_ENABLED !== "true") return false;
  const re = /(healthy|immunity|fitness|wellness|diet|exercise|sleep|stress)/i;
  return re.test(text);
}

export function getLifestyleTips() {
  return {
    lifestyle: {
      nutrition: ["Eat whole grains, fruits, vegetables"],
      exercise: ["150 min/week brisk walking"],
      stress: ["10 min meditation daily"],
      references: ["https://www.who.int/diet-physical-activity"],
    },
  };
}
