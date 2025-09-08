export type RecallIntent =
  | { type: "repeatLast" }
  | { type: "recallTag"; tag: "diet"|"recipe"|"plan"|"workout"|"dosage"|"meds"|"symptoms"|"labs"|"guidelines"|"trials" }
  | null;

export function detectRecallIntent(text: string): RecallIntent {
  const s = text.toLowerCase().trim();

  // “repeat”, “pull up again”, “show previous”, “show that again”
  if (/\b(repeat|again|pull up|show (it|that|previous|last))\b/.test(s)) {
    return { type: "repeatLast" };
  }

  // “show the diet again”, “pull up the recipe”, “recall trials”
  const tagMap: Record<string, RecallIntent["tag"]> = {
    diet: "diet", recipe: "recipe", plan: "plan", workout: "workout", exercise: "workout",
    dosage: "dosage", dose: "dosage", meds: "meds", medication: "meds",
    symptoms: "symptoms", labs: "labs", guidelines: "guidelines", trials: "trials"
  };

  for (const k of Object.keys(tagMap)) {
    if (new RegExp(`\\b(${k})\\b`).test(s) && /\b(show|pull up|repeat|again|bring back|recall)\b/.test(s)) {
      return { type: "recallTag", tag: tagMap[k] };
    }
  }

  return null;
}

