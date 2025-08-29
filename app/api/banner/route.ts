import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';

export async function GET(){
  const items: any[] = [];
  // WHO News
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://www.who.int/feeds/entity/news/en/rss.xml');
    feed.items.slice(0,5).forEach(i=>items.push({ title: i.title, url: i.link, source: 'WHO', time: i.pubDate }));
  } catch(e){}

  // ClinicalTrials recent recruiting thyroid (example query)
  try {
    const r = await fetch('https://clinicaltrials.gov/api/v2/studies?filter.overallStatus=RECRUITING&query.term=thyroid&sort=lastUpdatePostDate:desc&pageSize=5');
    if(r.ok){
      const j = await r.json();
      (j.studies || []).forEach((s:any)=>{
        items.push({ title: s.protocolSection?.identificationModule?.briefTitle, url: `https://clinicaltrials.gov/study/${s.protocolSection?.identificationModule?.nctId}`, source:'ClinicalTrials.gov', time: s.hasResults||'' });
      });
    }
  } catch(e){}

  // openFDA label updates
  try {
    const key = process.env.OPENFDA_API_KEY || '';
    const r = await fetch(`https://api.fda.gov/drug/label.json?search=effective_time:[20240101+TO+20251231]&limit=5${key?`&api_key=${key}`:''}`);
    if(r.ok){
      const j = await r.json();
      (j.results || []).forEach((s:any)=>{
        items.push({ title: (s.openfda?.brand_name||['Drug label update']).join(', '), url: 'https://api.fda.gov/drug/label.json', source:'openFDA', time: String(s.effective_time) });
      });
    }
  } catch(e){}

  // PubMed recent (example general query)
  try {
    const key = process.env.NCBI_API_KEY || '';
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=cancer+clinical+trial&reldate=3&retmax=5&api_key=${key}`;
    const r = await fetch(url);
    if(r.ok){
      const xml = await r.text();
      items.push({ title: 'PubMed: latest clinical trial IDs', url, source:'PubMed', time: 'recent' });
    }
  } catch(e){}

  return NextResponse.json(items.slice(0,20));
}
