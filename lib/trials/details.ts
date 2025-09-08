export type TrialDetail = {
  id: string;
  title: string;
  status: string;
  phase: string | null;
  conditions: string[];
  outcomes: { measure: string; description: string }[];
  locations: { facility?: string; city?: string; country?: string }[];
  url: string | null;
};

export async function fetchTrialDetail(nctid: string): Promise<TrialDetail> {
  const r = await fetch(`/api/trials/${encodeURIComponent(nctid)}`);
  if (!r.ok) throw new Error(`Failed to fetch trial: ${r.status}`);
  const j = await r.json();
  return j.trial as TrialDetail;
}

export function formatTrialDetail(t: TrialDetail): string {
  const lines: string[] = [];
  lines.push(`**${t.title || t.id}**`);
  lines.push(`- **NCT ID:** ${t.id}`);
  if (t.phase) lines.push(`- **Phase:** ${t.phase}`);
  if (t.status) lines.push(`- **Status:** ${t.status}`);
  if (t.conditions.length) {
    lines.push(`- **Conditions:** ${t.conditions.join(", ")}`);
  }
  if (t.outcomes.length) {
    lines.push(`- **Primary outcomes:**`);
    for (const o of t.outcomes.slice(0, 3)) {
      lines.push(
        `  - ${o.measure}${o.description ? ` — ${o.description}` : ""}`
      );
    }
  }
  if (t.locations.length) {
    const locs = t.locations
      .slice(0, 3)
      .map((l) =>
        [l.facility, l.city, l.country].filter(Boolean).join(", ")
      )
      .filter(Boolean);
    if (locs.length) lines.push(`- **Locations:** ${locs.join(" · ")}`);
  }
  if (t.url) lines.push(`- **Link:** ${t.url}`);
  return lines.join("\n");
}

