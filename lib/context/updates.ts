import { ConversationState } from "./state";

export function applyContradictions(state: ConversationState, userText: string): { state: ConversationState; changed: string[] } {
  const lower = userText.toLowerCase();
  const changed: string[] = [];
  const next = { ...state, facts: { ...state.facts }, preferences: { ...state.preferences } };

  // Weight
  const kg =
    lower.match(/(?:weight|weigh|wt)\s*[:=]?\s*(\d{2,3})\s?kg/) ||
    lower.match(/(\d{2,3})\s?kg\s?(?:now|today)?/);
  if (kg && next.facts.weight !== `${kg[1]} kg`) {
    next.facts.weight = `${kg[1]} kg`;
    changed.push("weight");
  }

  // Height
  const cm = lower.match(/(\d{3})\s?cm/);
  if (cm && next.facts.height !== `${cm[1]} cm`) {
    next.facts.height = `${cm[1]} cm`;
    changed.push("height");
  }

  // Diet pref
  if (/\bnon[-\s]?veg\b|chicken|fish|egg/.test(lower) && next.preferences.diet !== "non-veg") {
    next.preferences.diet = "non-veg";
    changed.push("diet");
  } else if (/\bveg\b/.test(lower) && next.preferences.diet !== "veg") {
    next.preferences.diet = "veg";
    changed.push("diet");
  }

  return { state: next, changed };
}
