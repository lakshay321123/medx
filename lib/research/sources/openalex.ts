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

export async function searchOpenAlex(query: string): Promise<Citation[]> {
  const url = new URL(`https://api.openalex.org/works`);
  if (query) url.searchParams.set("search", query);
  url.searchParams.set("per-page", "25");
  if (process.env.OPENALEX_MAILTO) url.searchParams.set("mailto", process.env.OPENALEX_MAILTO);
  const data = await fetchJson(url.toString()).catch(() => null);
  const results = data?.results || [];
  return results.map((w: any) => {
    const types = [w.type, w.type_crossref].filter(Boolean);
    return {
      id: w.id,
      title: w.display_name || "",
      url: w.primary_location?.landing_page_url || w.id,
      source: "openalex",
      date: w.publication_date || (w.publication_year ? String(w.publication_year) : ""),
      extra: {
        authors: (w.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
        evidenceLevel: classifyPubType(types),
      },
    };
  });
}

