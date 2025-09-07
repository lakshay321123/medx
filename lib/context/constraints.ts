import type { ConstraintLedger } from "./state";

/**
 * Very lightweight extractor for “add/use/with”, “without/no”, and “instead of A use B”.
 * Domain-agnostic: works for recipes, workouts, trials queries, etc.
 */
export function parseConstraintsFromText(text: string): ConstraintLedger {
  const s = text.toLowerCase();

  const include = new Set<string>();
  const exclude = new Set<string>();
  const substitutions: Array<{ from: string; to: string }> = [];

  // include: “add X”, “use X”, “with X”
  const incPatterns = [
    /(add|use|with)\s+([a-z0-9\-\s]+?)(?:[,.;]|$)/g,
    /(include)\s+([a-z0-9\-\s]+?)(?:[,.;]|$)/g,
  ];
  for (const re of incPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      const item = clean(m[2]);
      if (item) include.add(item);
    }
  }

  // exclude: “no X”, “without X”, “avoid X”
  const excPatterns = [
    /(no|without|avoid)\s+([a-z0-9\-\s]+?)(?:[,.;]|$)/g,
  ];
  for (const re of excPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      const item = clean(m[2]);
      if (item) exclude.add(item);
    }
  }

  // substitutions: “instead of A use B”, “replace A with B”, “swap A for B”
  const subPatterns = [
    /instead of\s+([a-z0-9\-\s]+?)\s+(use|with|try)\s+([a-z0-9\-\s]+?)(?:[,.;]|$)/g,
    /(replace)\s+([a-z0-9\-\s]+?)\s+(with|by|for)\s+([a-z0-9\-\s]+?)(?:[,.;]|$)/g,
    /(swap)\s+([a-z0-9\-\s]+?)\s+(for)\s+([a-z0-9\-\s]+?)(?:[,.;]|$)/g,
  ];
  for (const re of subPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      const from = clean(m[m.length - 3]);
      const to   = clean(m[m.length - 1]);
      if (from && to) substitutions.push({ from, to });
    }
  }

  // de-duplicate excludes that collide with includes
  for (const inc of include) {
    if (exclude.has(inc)) exclude.delete(inc);
  }

  return {
    include: Array.from(include),
    exclude: Array.from(exclude),
    substitutions,
  };
}

function clean(x?: string): string {
  if (!x) return "";
  // strip trivial words and whitespace
  return x
    .replace(/\b(the|a|an|please|kindly|some)\b/g, " ")
    .replace(/[^a-z0-9\-\s]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Merge new constraints into an existing ledger. */
export function mergeLedger(a: ConstraintLedger | undefined, b: ConstraintLedger): ConstraintLedger {
  const include = new Set([...(a?.include ?? []), ...b.include]);
  const exclude = new Set([...(a?.exclude ?? []), ...b.exclude]);

  const subKey = (p: {from: string; to: string}) => `${p.from}→${p.to}`;
  const subs = new Map<string, {from: string; to: string}>();
  for (const p of a?.substitutions ?? []) subs.set(subKey(p), p);
  for (const p of b.substitutions) subs.set(subKey(p), p);

  // remove exact duplicates across include/exclude
  for (const inc of include) if (exclude.has(inc)) exclude.delete(inc);

  return {
    include: Array.from(include),
    exclude: Array.from(exclude),
    substitutions: Array.from(subs.values()),
  };
}
