import type { ConstraintLedger } from "@/lib/context/state";

/** Produces a single-line recap like: Applied: include [green tomatoes, burrata]; swap [red tomatoes → green tomatoes] */
export function buildConstraintRecap(c?: ConstraintLedger): string {
  if (!c) return "";
  const parts: string[] = [];

  if (c.include?.length) parts.push(`include [${c.include.join(", ")}]`);
  if (c.exclude?.length) parts.push(`exclude [${c.exclude.join(", ")}]`);
  if (c.substitutions?.length) {
    const swaps = c.substitutions.map(p => `${p.from} → ${p.to}`).join(", ");
    if (swaps) parts.push(`swap [${swaps}]`);
  }

  if (!parts.length) return "";
  return `\n\n_Recap: ${parts.join("; ")}._`;
}
