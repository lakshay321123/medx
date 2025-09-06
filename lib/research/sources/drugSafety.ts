import type { Citation } from "./dailymed";
import { fetchRxCui } from "./rxnorm";
import { searchDailyMed } from "./dailymed";
import { searchOpenFda } from "./openfda";

export async function searchDrugSafety(drug: string): Promise<Citation[]> {
  const rx = await fetchRxCui(drug);
  if (!rx) return [];
  const [dmRes, fdaRes] = await Promise.allSettled([
    searchDailyMed(rx),
    searchOpenFda(drug)
  ]);
  const dm = dmRes.status === "fulfilled" ? dmRes.value : [];
  const fda = fdaRes.status === "fulfilled" ? fdaRes.value : [];
  return [...dm, ...fda];
}

