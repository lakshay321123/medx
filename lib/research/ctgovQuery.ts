export function buildCtgovExpr(q: {
  condition?: string;
  keywords?: string[];
  phase?: "1" | "2" | "3" | "4";
  status?: string;
  countries?: string[];
  genes?: string[];
}) {
  const parts: string[] = [];

  if (q.condition) {
    parts.push(`AREA[ConditionSearch] ${quote(q.condition)}`);
  }
  if (q.keywords?.length) {
    for (const kw of q.keywords) parts.push(`AREA[FullTextSearch] ${quote(kw)}`);
  }
  if (q.phase) {
    parts.push(`AREA[Phase] "${romanPhase(q.phase)}"`);
  }
  if (q.status === "recruiting") parts.push(`AREA[OverallStatus] "Recruiting"`);
  if (q.status === "active") parts.push(`AREA[OverallStatus] "Active, not recruiting"`);
  if (q.status === "completed") parts.push(`AREA[OverallStatus] "Completed"`);
  if (q.countries?.length) {
    const ors = q.countries.map(c => `AREA[LocationCountry] ${quote(c)}`).join(" OR ");
    parts.push(q.countries.length > 1 ? `(${ors})` : ors);
  }
  (q.genes || []).forEach(g => parts.push(`AREA[FullTextSearch] ${quote(g)}`));

  const expr = parts.length ? parts.join(" AND ") : `AREA[FullTextSearch] ${quote("cancer")}`;
  return expr;
}

export function quote(s: string) {
  return `"${s.replace(/"/g, '\\"')}"`;
}

export function romanPhase(n: "1" | "2" | "3" | "4") {
  return ["I", "II", "III", "IV"][parseInt(n) - 1];
}
