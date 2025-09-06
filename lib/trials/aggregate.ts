import { fetchCTGov } from "./sources/ctgov";
import { fetchCTRI } from "./sources/ctri";
import { fetchICTRP } from "./sources/ictrp";
import { fetchNCI } from "./sources/nci";
import { dedupeTrials } from "./merge";
import { TrialRecord } from "./types";

export async function getUnifiedTrials(q: {
  condition: string; country?: string; status?: string; phase?: string; page?: number; pageSize?: number;
}): Promise<TrialRecord[]> {
  const [ctgov, ctri, ictrp, nci] = await Promise.allSettled([
    fetchCTGov(q),
    fetchCTRI(q),
    fetchICTRP(q),
    fetchNCI(q),
  ]);

  const lists: TrialRecord[][] = [
    ctgov.status === "fulfilled" ? ctgov.value : [],
    ctri.status  === "fulfilled" ? ctri.value  : [],
    ictrp.status === "fulfilled" ? ictrp.value : [],
    nci.status   === "fulfilled" ? nci.value   : [],
  ];

  const merged = dedupeTrials(lists);

  // simple sort: Recruiting first, then by most recently updated
  const order = (s?: string) => (s?.toLowerCase().includes("recruit") ? 0 : 1);
  merged.sort((a,b) => order(a.status)-order(b.status) || (b.lastUpdated||"").localeCompare(a.lastUpdated||""));

  // paginate
  const start = ((q.page ?? 1) - 1) * (q.pageSize ?? 10);
  return merged.slice(start, start + (q.pageSize ?? 10));
}
