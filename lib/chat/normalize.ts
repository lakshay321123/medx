import { Suggestion } from "./suggestions";

export function normalizeSuggestions(input: unknown): Suggestion[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((x, i) =>
      typeof x === "string"
        ? ({ id: `s${i}`, label: x } satisfies Suggestion)
        : (x as Suggestion)
    );
  }
  return [];
}
