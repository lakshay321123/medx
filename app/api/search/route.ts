import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  const { query } = await req.json();
  if(!query) return NextResponse.json({ results: [] });

  const results: any[] = [];

  // PubMed search
  try {
    const apiKey = process.env.NCBI_API_KEY || '';
    const es = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=3&term=${encodeURIComponent(query)}${apiKey?`&api_key=${apiKey}`:''}&retmode=json`);
    const ids = (await es.json())?.esearchresult?.idlist || [];
    if(ids.length){
      const sum = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}${apiKey?`&api_key=${apiKey}`:''}&retmode=json`);
      const j = await sum.json();
      ids.forEach((id: string)=>{
        const title = j.result?.[id]?.title;
        if(title){
          results.push({
            title,
            snippet: j.result?.[id]?.source || '',
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
            source: 'PubMed'
          });
        }
      });
    }
  } catch{}

  // ClinicalTrials.gov search
  try {
    const ct = await fetch(`https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=3`);
    if(ct.ok){
      const j = await ct.json();
      for(const s of j.studies || []){
        const id = s.protocolSection?.identificationModule?.nctId;
        const title = s.protocolSection?.identificationModule?.briefTitle;
        const summary = s.protocolSection?.descriptionModule?.briefSummary?.description;
        if(title){
          results.push({
            title,
            snippet: summary || '',
            url: id ? `https://clinicaltrials.gov/study/${id}` : '',
            source: 'ClinicalTrials.gov'
          });
        }
      }
    }
  } catch{}

  // openFDA drug labels
  try {
    const key = process.env.OPENFDA_API_KEY || '';
    const of = await fetch(`https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=3${key?`&api_key=${key}`:''}`);
    if(of.ok){
      const j = await of.json();
      for(const r of j.results || []){
        const title = r.openfda?.brand_name?.[0] || r.id || 'Drug label';
        const snippet = (r.indications_and_usage?.[0] || '').slice(0,200);
        results.push({
          title,
          snippet,
          url: 'https://open.fda.gov',
          source: 'openFDA'
        });
      }
    }
  } catch{}

  // Crossref scholarly metadata
  try {
    const cr = await fetch(`https://api.crossref.org/works?rows=3&query=${encodeURIComponent(query)}`);
    if(cr.ok){
      const j = await cr.json();
      for(const item of j.message?.items || []){
        const title = Array.isArray(item.title) ? item.title[0] : item.title;
        if(title){
          const snippet = Array.isArray(item['container-title']) ? item['container-title'][0] : (item['container-title'] || '');
          results.push({
            title,
            snippet,
            url: item.URL || '',
            source: 'Crossref'
          });
        }
      }
    }
  } catch{}

  return NextResponse.json({ results });
}
