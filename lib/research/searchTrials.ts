import { useTrialsSearchStore } from "./useTrialsSearchStore";

const iso2ToApi = (iso: string) => {
  if (iso === "WW") return "Worldwide";
  if (iso === "EU") return "European Union";
  return iso; // "US","IN","GB","JP"
};

export async function fetchTrials() {
  const { q, phases, status, countries, genes } = useTrialsSearchStore.getState();

  const params = new URLSearchParams();
  if (q) params.set("q", q);

  // API expects phases as CSV of integers: "1,2"
  if (phases.length) params.set("phase", phases.join(","));

  // API expects status as exact text; omit "Any"
  if (status && status !== "Any") params.set("status", status);

  // Countries: send as CSV of labels the backend understands
  if (countries.length) params.set("country", countries.map(iso2ToApi).join(","));

  if (genes.length) params.set("genes", genes.join(","));

  const res = await fetch(`/api/trials?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch trials");
  return res.json();
}
