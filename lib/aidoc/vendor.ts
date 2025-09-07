// Plug your real OpenAI client here. This is a safe fallback for local/dev.
type CallIn = { system: string; user: string; instruction: string };
export async function callOpenAIJson({ system, user, instruction }: CallIn): Promise<any> {
  // In dev: return a minimal JSON echo
  return {
    reply: "Thanks — I’ll personalize advice using your history. What symptoms are you having today?",
    save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
    observations: {
      short: "Let’s gather a bit more info and plan next steps. No stale labs will be quoted.",
      long: "I’ll consider your active conditions. If we need a lab that’s stale, I’ll suggest a repeat."
    }
  };
}
