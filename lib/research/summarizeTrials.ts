import type { Trial } from "@/lib/trials/search";

export function summarizeTrials(trials: Trial[], mode: "patient" | "doctor"): string {
  if (!trials.length) return "No trials found for the selected filters.";

  const countsByPhase: Record<string, number> = {};
  const countsByStatus: Record<string, number> = {};
  const countsByCountry: Record<string, number> = {};

  for (const t of trials) {
    if (t.phase) countsByPhase[t.phase] = (countsByPhase[t.phase] || 0) + 1;
    if (t.status) countsByStatus[t.status] = (countsByStatus[t.status] || 0) + 1;
    if (t.country) countsByCountry[t.country] = (countsByCountry[t.country] || 0) + 1;
  }

  const total = trials.length;

  if (mode === "patient") {
    // patient-friendly summary
    const mainPhase = Object.entries(countsByPhase).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const mainStatus = Object.entries(countsByStatus).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const mainCountry = Object.entries(countsByCountry).sort((a,b)=>b[1]-a[1])[0]?.[0];

    return `We found ${total} trials. Most are in ${mainPhase ? `Phase ${mainPhase}` : "different phases"} and ${mainStatus || "varied status"}. ${mainCountry ? `Many are based in ${mainCountry}.` : ""}`;
  }

  // doctor mode summary
  const phases = Object.entries(countsByPhase).map(([p,c]) => `${c}× Phase ${p}`).join(", ");
  const statuses = Object.entries(countsByStatus).map(([s,c]) => `${c}× ${s}`).join(", ");
  const topCountries = Object.entries(countsByCountry).sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([c,cnt]) => `${c} (${cnt})`).join(", ");

  return `${total} trials retrieved. Phases: ${phases || "N/A"}. Statuses: ${statuses || "N/A"}. Top countries: ${topCountries || "N/A"}.`;
}

