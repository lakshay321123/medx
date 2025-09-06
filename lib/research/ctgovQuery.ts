export function buildCtgovExpr(q: {
  condition?: string;
  keywords?: string[];
  phase?: "1" | "2" | "3" | "4";
  recruiting?: boolean;
  country?: string;
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
  if (q.recruiting === true) {
    parts.push(`AREA[OverallStatus] "Recruiting"`);
  }
  if (q.country) {
    parts.push(`AREA[LocationCountry] ${quote(q.country)}`);
  }

  const expr = parts.length ? parts.join(" AND ") : `AREA[FullTextSearch] ${quote("cancer")}`;
  return expr;
}

export function quote(s: string) {
  return `"${s.replace(/"/g, '\\"')}"`;
}

export function romanPhase(n: "1" | "2" | "3" | "4") {
  return ["I", "II", "III", "IV"][parseInt(n) - 1];
}
