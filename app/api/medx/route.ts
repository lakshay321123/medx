import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/http';

const BASE = process.env.LLM_BASE_URL!;
const MODEL = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
const KEY   = process.env.LLM_API_KEY!;

async function classifyIntent(query: string, mode: 'patient'|'doctor') {
  const sys = `You are a router. Classify EXACTLY one intent:
- DIAGNOSIS_QUERY      (map condition to codes; trials if doctor)
- DRUGS_LIST           (medication list; interactions)
- CLINICAL_TRIALS_QUERY(trials for condition)
- GENERAL_HEALTH       (explain simply)

Return STRICT JSON like: {"intent":"DIAGNOSIS_QUERY","keywords":["thyroid cancer"]}`;
  const r = await fetchWithTimeout(`${BASE.replace(/\/$/,'')}/chat/completions`, {
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},
    body: JSON.stringify({ model: MODEL, temperature: 0, messages: [
      { role:'system', content: sys },
      { role:'user', content: `Mode=${mode}\nQuery=${query}\nJSON only:` }
    ]})
  }, { timeoutMs: 12000 });
  const j = await r.json();
  try { return JSON.parse(j.choices?.[0]?.message?.content || '{}'); }
  catch { return { intent:'GENERAL_HEALTH', keywords:[] }; }
}

async function umlsSearch(term: string){
  const res = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/umls/search?q=${encodeURIComponent(term)}`);
  return res.json();
}
async function umlsCrosswalk(cui: string, target:'ICD10CM'|'SNOMEDCT_US'|'RXNORM'){
  const res = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/umls/crosswalk?cui=${encodeURIComponent(cui)}&target=${target}`);
  return res.json();
}
async function pubmedTrials(q: string){
  const term = `${q} AND clinical trial[Publication Type]`;
  const apiKey = process.env.NCBI_API_KEY || '';
  const es = await fetchWithTimeout(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=5&sort=pub+date&term=${encodeURIComponent(term)}${apiKey?`&api_key=${apiKey}`:''}&retmode=json`,
    {}, { timeoutMs: 12000 }
  );
  const ids = (await es.json())?.esearchresult?.idlist || [];
  if (!ids.length) return [];
  const sum = await fetchWithTimeout(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}${apiKey?`&api_key=${apiKey}`:''}&retmode=json`,
    {}, { timeoutMs: 12000 }
  );
  const j = await sum.json();
  return ids.map((id:string)=>({ id, title: j.result?.[id]?.title, link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, source:'PubMed' }));
}
async function rxnormNormalize(text: string){
  const r = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/rxnorm/normalize`,{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text })
  });
  return r.json();
}
async function rxnavInteractions(rxcuis: string[]){
  const r = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/interactions`,{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rxcuis })
  });
  return r.json();
}

export async function POST(req: NextRequest){
  const { query, mode } = await req.json();
  if(!query) return NextResponse.json({ intent:'GENERAL_HEALTH', sections:{} });

  const cls = await classifyIntent(query, mode==='doctor'?'doctor':'patient');
  const intent = cls.intent || 'GENERAL_HEALTH';
  const keywords: string[] = cls.keywords || [];
  const sections: any = {};

  try {
    if (intent === 'DIAGNOSIS_QUERY') {
      const term = keywords[0] || query;
      const s = await umlsSearch(term);
      const cui = s.results?.[0]?.ui || null;
      if (cui) {
        const icd = await umlsCrosswalk(cui,'ICD10CM');
        const snomed = await umlsCrosswalk(cui,'SNOMEDCT_US');
        sections.codes = { cui, icd: icd.mappings?.slice(0,6), snomed: snomed.mappings?.slice(0,6) };
      }
      if (mode==='doctor') sections.trials = await pubmedTrials(term);
    } else if (intent === 'DRUGS_LIST') {
      const rx = await rxnormNormalize(query);
      sections.meds = rx.meds;
      if ((rx.meds||[]).length >= 2) {
        sections.interactions = (await rxnavInteractions(rx.meds.map((m:any)=>m.rxcui))).interactions;
      }
    } else if (intent === 'CLINICAL_TRIALS_QUERY') {
      const term = keywords[0] || query;
      sections.trials = await pubmedTrials(term);
    }
  } catch(e:any){ sections.error = String(e?.message || e); }

  return NextResponse.json({ intent, sections });
}
