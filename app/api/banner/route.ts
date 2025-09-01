import { NextResponse } from 'next/server';
import { getWhoNews } from '@/lib/who';
import { getDrugLabels } from '@/lib/openfda';
import { getTrials } from '@/lib/clinicaltrials';
import { searchPubmed } from '@/lib/pubmed';

interface Item {
  headline: string;
  source: string;
  link: string;
}

async function whoHeadline(): Promise<Item | null> {
  try {
    const xml = await getWhoNews();
    const m = xml.match(/<item>\s*<title>([^<]+)<\/title>\s*<link>([^<]+)<\/link>/i);
    if (m) return { headline: m[1], link: m[2], source: 'WHO' };
  } catch {}
  return null;
}

async function openFdaHeadline(): Promise<Item | null> {
  try {
    const j = await getDrugLabels();
    const first = j.results?.[0];
    if (first) {
      const title = first.openfda?.brand_name?.[0] || first.id || 'openFDA label';
      const link = first.id
        ? `https://open.fda.gov/drug/label/${first.id}`
        : 'https://open.fda.gov/';
      return { headline: title, link, source: 'openFDA' };
    }
  } catch {}
  return null;
}

async function clinicalHeadline(): Promise<Item | null> {
  try {
    const j = await getTrials('cancer');
    const first = j?.studies?.[0];
    const title = first?.protocolSection?.identificationModule?.briefTitle;
    const nct = first?.protocolSection?.identificationModule?.nctId;
    if (title && nct) {
      return {
        headline: title,
        link: `https://clinicaltrials.gov/study/${nct}`,
        source: 'ClinicalTrials.gov',
      };
    }
  } catch {}
  return null;
}

async function pubmedHeadline(): Promise<Item | null> {
  try {
    const xml = await searchPubmed('cancer');
    const id = xml.match(/<Id>(\d+)<\/Id>/)?.[1];
    if (!id) return null;
    const apiKey = process.env.NCBI_API_KEY || '';
    const sum = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${id}${apiKey ? `&api_key=${apiKey}` : ''}&retmode=json`,
      { next: { revalidate: 300 } }
    );
    if (!sum.ok) return null;
    const j = await sum.json();
    const title = j.result?.[id]?.title;
    if (title) {
      return {
        headline: title,
        link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        source: 'PubMed',
      };
    }
  } catch {}
  return null;
}

export async function GET() {
  const settled = await Promise.allSettled([
    whoHeadline(),
    openFdaHeadline(),
    clinicalHeadline(),
    pubmedHeadline(),
  ]);
  const data = settled
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean);
  return NextResponse.json(data);
}

