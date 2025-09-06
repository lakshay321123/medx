let lastAsked: string | null = null;

export function maybeClarify(query: string, condition: string): string | null {
  if (lastAsked === condition) return null;
  lastAsked = condition;
  return `Are you interested in trials for ${condition} specifically?`;
}
