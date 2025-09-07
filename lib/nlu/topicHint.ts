export function inferTopicFromAssistant(text: string): string | undefined {
  if (/butter chicken/i.test(text)) return "Butter chicken recipe";
  if (/clinical trial/i.test(text)) return "Clinical trials";
  if (/diet|meal plan/i.test(text)) return "Diet plan";
  if (/workout|strength|abs/i.test(text)) return "Workout plan";
  return undefined;
}
