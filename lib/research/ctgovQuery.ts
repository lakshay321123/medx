export function buildCtgovExpr(q: {
  condition?: string;
  keywords?: string[];
  phase?: string;
  status?: string;
  country?: string;
  gene?: string;
}) {
  const parts: string[] = [];

  if (q.condition) {
    parts.push(`AREA[ConditionSearch] ${quote(q.condition)}`);
  }
  if (q.keywords?.length) {
    for (const kw of q.keywords) parts.push(`AREA[FullTextSearch] ${quote(kw)}`);
  }
  if (q.phase) {
    parts.push(`AREA[Phase] "${q.phase}"`);
  }
  if (q.status === "recruiting") parts.push(`AREA[OverallStatus] "Recruiting"`);
  if (q.status === "active") parts.push(`AREA[OverallStatus] "Active, not recruiting"`);
  if (q.status === "completed") parts.push(`AREA[OverallStatus] "Completed"`);
  if (q.country) {
    parts.push(`AREA[LocationCountry] ${quote(q.country)}`);
  }
  if (q.gene) {
    parts.push(`AREA[FullTextSearch] ${quote(q.gene)}`);
  }

  const expr = parts.length ? parts.join(" AND ") : `AREA[FullTextSearch] ${quote("cancer")}`;
  return expr;
}

export function quote(s: string) {
  return `"${s.replace(/"/g, '\\"')}"`;
}

