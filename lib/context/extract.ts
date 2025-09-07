import { ConversationState } from "./state";

// Replace with your LLM call if you have server-side functions.
// Here we keep it deterministic & safe with simple heuristics + optional model.
function simpleHeuristics(user: string, assistant?: string) {
  const text = `${user}\n${assistant ?? ""}`.toLowerCase();
  const facts: Record<string, string> = {};
  const prefs: Record<string, string> = {};
  const intents: string[] = [];
  const open: string[] = [];

  // Generic signal extraction (expand as needed)
  const kg = text.match(/(\d{2,3})\s?kg/);
  if (kg) facts.weight = `${kg[1]} kg`;
  const cm = text.match(/(\d{3})\s?cm/);
  if (cm) facts.height = `${cm[1]} cm`;
  if (/\bnon[-\s]?veg\b|chicken|fish|egg/.test(text)) prefs.diet = "non-veg";
  else if (/\bveg\b/.test(text)) prefs.diet = "veg";
  if (/palette|hex|color/.test(text)) intents.push("ui_palette");
  if (/trial|nsclc|phase|recruiting|gene|egfr|alk|kras/.test(text)) intents.push("trials");
  if (/diet|meal|protein|calorie/.test(text)) intents.push("diet");
  if (/workout|exercise|gym|training/.test(text)) intents.push("workout");
  if (/mockup|ui|design|component|tailwind|color/.test(text)) intents.push("ui_design");
  if (/bmi|body mass/.test(text)) intents.push("bmi_calc");

  // Missing info examples
  if (intents.includes("diet") && !prefs.diet) open.push("diet preference");
  if (intents.includes("bmi_calc") && !facts.height) open.push("height");
  if (intents.includes("bmi_calc") && !facts.weight) open.push("weight");

  return { facts, prefs, intents, open };
}

export function refreshState(prev: ConversationState, user: string, assistant?: string): ConversationState {
  const { facts, prefs, intents, open } = simpleHeuristics(user, assistant);

  const mergedFacts = { ...prev.facts, ...facts };
  const mergedPrefs = { ...prev.preferences, ...prefs };
  const mergedIntents = [...new Set([...(intents || []), ...(prev.intents || [])])].slice(0, 8);

  return {
    topic: prev.topic || (intents[0] ?? prev.topic),
    intents: mergedIntents,
    facts: mergedFacts,
    preferences: mergedPrefs,
    decisions: prev.decisions,
    open_questions: Array.from(new Set([...(prev.open_questions || []), ...open])),
    last_updated_iso: new Date().toISOString(),
  };
}
