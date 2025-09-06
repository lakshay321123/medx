import { fetchJson } from "@/lib/research/net";

export async function fetchRxCui(drug: string): Promise<string | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drug)}`;
  const data = await fetchJson(url).catch(() => null);
  const id = data?.idGroup?.rxnormId?.[0];
  return id || null;
}

