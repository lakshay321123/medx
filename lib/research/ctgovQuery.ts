import type { Phase, Status } from "@/types/research";

export function buildCtgovExpr(q: {
  condition?: string;
  keywords?: string[];
  phase?: Phase;
  status?: Status;
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
    parts.push(`AREA[Phase] "${romanPhase(q.phase)}"`);
  }
  if (q.status === "Recruiting") parts.push(`AREA[OverallStatus] "Recruiting"`);
  if (q.status === "Completed") parts.push(`AREA[OverallStatus] "Completed"`);
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

export function romanPhase(n: Phase) {
  return ["I", "II", "III", "IV"][parseInt(n) - 1];
}
