export type EditIntent =
  | { type: "recall"; target?: "recipe" | "plan" }
  | { type: "finalize"; target?: "recipe" | "plan" }
  | { type: "replace"; from: string; to: string }
  | { type: "add"; what: string }
  | { type: "remove"; what: string }
  | { type: "transform"; to: "pasta" | "soup" | "sandwich" | "salad" | "generic"; extra?: string }
  | null;

const clean = (s: string) => s.trim().replace(/^["'`]|["'`]$/g, "");

export function detectEditIntent(text: string): EditIntent {
  const s = text.toLowerCase().trim();

  // recall / show again
  if (/\b(pull up|show|repeat|again|previous|last)\b/.test(s) &&
      /\b(recipe|plan)?\b/.test(s)) {
    return { type: "recall" };
  }
  if (/\bfinal( recipe| plan)?\b/.test(s) || /\bfinalize\b/.test(s)) {
    return { type: "finalize" };
  }

  // replace X with Y
  const rep = s.match(/\breplace\b\s+(.+?)\s+\bwith\b\s+(.+)/i);
  if (rep) return { type: "replace", from: clean(rep[1]), to: clean(rep[2]) };

  // add X
  const add = s.match(/\badd\b\s+(.+)/i);
  if (add) return { type: "add", what: clean(add[1]) };

  // remove X / without X
  const rem = s.match(/\b(remove|without|no)\b\s+(.+)/i);
  if (rem) return { type: "remove", what: clean(rem[2]) };

  // simple transforms
  if (/\b(make|turn)\b.*\binto\b.*\bpasta\b/.test(s)) return { type: "transform", to: "pasta" };
  if (/\b(make|turn)\b.*\binto\b.*\bsoup\b/.test(s))  return { type: "transform", to: "soup" };
  if (/\b(make|turn)\b.*\binto\b.*\bsandwich\b/.test(s)) return { type: "transform", to: "sandwich" };
  if (/\b(make|turn)\b.*\binto\b.*\bsalad\b/.test(s)) return { type: "transform", to: "salad" };

  return null;
}
