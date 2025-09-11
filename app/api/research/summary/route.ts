import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pmid = (searchParams.get('pmid') || '').trim();
  if (!pmid) return NextResponse.json({ error: 'Missing pmid' }, { status: 400 });

  const apiKey = process.env.NCBI_API_KEY || '';
  const link = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  try {
    const efetch = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&retmode=xml${apiKey ? `&api_key=${apiKey}` : ''}`,
      { headers: { 'Accept': 'application/xml' }, cache: 'no-store' }
    );
    if (!efetch.ok) throw new Error('NCBI efetch error');
    const xml = await efetch.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
    const article = parsed?.PubmedArticleSet?.PubmedArticle?.MedlineCitation?.Article;
    const title: string = article?.ArticleTitle || '';
    const abstractBlocks: any = article?.Abstract?.AbstractText;
    const abstractText: string = Array.isArray(abstractBlocks)
      ? abstractBlocks.map((b: any) => (typeof b === 'string' ? b : b?._ || '')).join(' ')
      : (typeof abstractBlocks === 'string' ? abstractBlocks : (abstractBlocks?._ || ''));
    const sentences = (title + '. ' + abstractText).replace(/\s+/g, ' ').split(/(?<=[.?!])\s+/).filter(Boolean).slice(0, 8);
    const bullets = sentences.slice(0, 5).map(s => s.length > 220 ? s.slice(0, 217) + '…' : s);
    return NextResponse.json({ bullets, link });
  } catch {
    return NextResponse.json({ bullets: [], link, note: 'Failed to fetch PubMed summary' }, { status: 200 });
  }
}
