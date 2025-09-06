import { fetchJson } from "@/lib/research/net";
import { classifyPubType } from "./utils";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  extra?: any;
};

export async function searchCrossref(query: string): Promise<Citation[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=25`;
  const data = await fetchJson(url).catch(() => null);
  const items = data?.message?.items || [];
  return items.map((p: any) => {
    const types = [p.type, ...(p.subject || [])].filter(Boolean);
    return {
      id: p.DOI || p.URL || "",
      title: Array.isArray(p.title) ? p.title[0] : p.title || "",
      url: p.URL || (p.DOI ? `https://doi.org/${p.DOI}` : ""),
      source: "crossref",
      date: p.issued?.["date-parts"]?.[0]?.join("-") || "",
      extra: { journal: (p["container-title"] || [])[0], evidenceLevel: classifyPubType(types) }
    };
  });
}

