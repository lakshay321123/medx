// Replace with your production OpenAI client that enforces response_format: json_object and temperature≈0.2
type CallIn = { system: string; user: string; instruction: string };
export async function callOpenAIJson({ system, user, instruction }: CallIn): Promise<any> {
  // DEV STUB (replace in prod)
  return {
    reply: "Thanks — I’ll personalize advice using your history. What symptoms are you having today?",
    save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
    observations: {
      short: "Let’s gather a bit more info and plan next steps. No stale labs will be quoted.",
      long: "I’ll consider your active conditions. If we need a lab that’s stale, I’ll suggest a repeat."
    }
  };
}
