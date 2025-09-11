import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";

const ON = (k: string) => (process.env[k] || "").toLowerCase() === "true";
const featureOn = () => ON("RESEARCH_SUMMARIZER");
const DEF_LANG = process.env.RESEARCH_DEFAULT_LANG || "en";

export async function GET(req: NextRequest) {
  if (!featureOn()) return NextResponse.json({ error: "disabled" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || DEF_LANG;
  const pmid = (searchParams.get("pmid") || "").trim();
  const nct = (searchParams.get("nct_id") || "").trim();
  const id = pmid || nct;
  const idType = pmid ? "pmid" : nct ? "nct_id" : null;
  if (!idType) return NextResponse.json({ error: "id_required" }, { status: 400 });

  console.log(JSON.stringify({ id_type: idType, id }));

  const apiKey = process.env.NCBI_API_KEY || "";
  const link = pmid
    ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    : `https://clinicaltrials.gov/study/${nct}`;

  try {
    if (!pmid) throw new Error("unsupported_id");
    const efetch = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${encodeURIComponent(
        pmid
      )}&retmode=xml${apiKey ? `&api_key=${apiKey}` : ""}`,
      { headers: { Accept: "application/xml" }, cache: "no-store" }
    );
    if (!efetch.ok) throw new Error("NCBI efetch error");
    const xml = await efetch.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
    const article = parsed?.PubmedArticleSet?.PubmedArticle?.MedlineCitation?.Article;
    const title: string = article?.ArticleTitle || "";
    const abstractBlocks: any = article?.Abstract?.AbstractText;
    const abstractText: string = Array.isArray(abstractBlocks)
      ? abstractBlocks.map((b: any) => (typeof b === "string" ? b : b?._ || "")).join(" ")
      : typeof abstractBlocks === "string"
      ? abstractBlocks
      : abstractBlocks?._ || "";
    const sentences = (title + ". " + abstractText)
      .replace(/\s+/g, " ")
      .split(/(?<=[.?!])\s+/)
      .filter(Boolean)
      .slice(0, 8);
    const bullets = sentences
      .filter((s) => !/recommend/i.test(s))
      .slice(0, 5)
      .map((s) => (s.length > 220 ? s.slice(0, 217) + "…" : s));
    return NextResponse.json({ title, bullets, link, lang });
  } catch {
    return NextResponse.json({ title: "", bullets: [], link, lang }, { status: 502 });
  }
}

