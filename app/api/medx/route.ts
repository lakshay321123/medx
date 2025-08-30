import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.LLM_BASE_URL!;
const MODEL = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
const KEY   = process.env.LLM_API_KEY!;

// Ensure trial relevance
function isRelevantTrial(trial:any, query:string) {
  const q = (query || '').toLowerCase();
  const title = (trial?.title || '').toLowerCase();
  const conds = (trial?.conditions || []).map((c:string)=>c.toLowerCase()).join(' ');
  return title.includes(q) || conds.includes(q);
}

// Normalize PubMed links
function cleanPubmedLink(link:string) {
  if (!link) return '';
  let url = link.trim();
  if (!url.startsWith('http')) url = 'https://' + url.replace(/^https?/, '');
  if (url.includes('pubmed')) return url;
  return 'https://pubmed.ncbi.nlm.nih.gov/';
}

// Format trials for output
function formatTrials(trials:any[], query:string) {
  const filtered = trials.filter(t => isRelevantTrial(t, query));
  return filtered.map((t, i) => ({
    id: `trial-${i+1}`,
    title: t.title || 'Untitled trial',
    eligibility: t.eligibility || 'See source',
    link: cleanPubmedLink(t.link),
    source: 'PubMed'
  }));
}

// Format SNOMED terms
function formatSNOMED(terms:any[]) {
  return (terms || []).map(t => ({
    name: t.name || 'Unknown term',
    code: t.code || ''
  }));
}

function makeFollowups(intent:string, sections:any, mode:'patient'|'doctor', query:string): string[] {
  const out: string[] = [];
  if (intent === 'NEARBY') {
    out.push('Show more within 10 km', 'Open now', 'Directions to the closest');
  }
  if (intent === 'DRUGS_LIST' && (sections?.interactions?.length || 0) > 0) {
    out.push('Explain these interactions simply', 'Are there safer alternatives?', 'What should I ask my doctor?');
  }
  if (intent === 'DIAGNOSIS_QUERY') {
    if (mode === 'doctor') {
      out.push('Latest clinical trials', 'Common ICD-10 codes', 'SNOMED terms');
    } else {
      out.push('Simple explanation', 'What tests are usually done?', 'Questions to ask my doctor');
    }
  }
  if ((sections?.trials?.length || 0) > 0) {
    out.push('Summarize trial eligibility', 'Any phase 3 results?');
  }
  if (!out.length) out.push('Explain in simpler words', 'Show trusted sources');
  return Array.from(new Set(out)).slice(0, 5);
}

async function classifyIntent(query: string, mode: 'patient'|'doctor') {
  const sys = `Classify a medical query into ONE:
- DIAGNOSIS_QUERY (map to ICD-10, SNOMED; trials if doctor)
- DRUGS_LIST (extract meds; check interactions)
- CLINICAL_TRIALS_QUERY (fetch trials)
- GENERAL_HEALTH (explain simply)

Return JSON: {"intent":"...","keywords":["..."]}`;
  const r = await fetch(`${BASE.replace(/\/$/,'')}/chat/completions`,{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},
    body: JSON.stringify({
      model: MODEL, temperature: 0,
      messages: [
        { role:'system', content: sys },
        { role:'user', content: `Mode=${mode}\nQuery=${query}\nJSON only:` }
      ]
    })
  });
  const j = await r.json();
  try { return JSON.parse(j.choices?.[0]?.message?.content || '{}'); }
  catch { return { intent:'GENERAL_HEALTH', keywords:[] }; }
}

async function umlsSearch(term: string){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/umls/search?q=${encodeURIComponent(term)}`);
  return res.ok ? res.json() : { results: [] };
}
async function umlsCrosswalk(cui: string, target:'ICD10CM'|'SNOMEDCT_US'|'RXNORM'){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/umls/crosswalk?cui=${encodeURIComponent(cui)}&target=${target}`);
  return res.ok ? res.json() : { mappings: [] };
}
async function pubmedTrials(q: string){
  const term = `${q} AND clinical trial[Publication Type]`;
  const apiKey = process.env.NCBI_API_KEY || '';
  const es = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=5&sort=pub+date&term=${encodeURIComponent(term)}${apiKey?`&api_key=${apiKey}`:''}&retmode=json`);
  const ids = (await es.json())?.esearchresult?.idlist || [];
  if (!ids.length) return [];
  const sum = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}${apiKey?`&api_key=${apiKey}`:''}&retmode=json`);
  const j = await sum.json();
  return ids.map((id:string)=>({ id, title: j.result?.[id]?.title, link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, source:'PubMed' }));
}
async function rxnormNormalize(text: string){
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/rxnorm/normalize`,{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text })
  });
  return r.ok ? r.json() : { meds: [] };
}
async function rxnavInteractions(rxcuis: string[]){
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/interactions`,{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rxcuis })
  });
  return r.ok ? r.json() : { interactions: [] };
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
        sections.codes = { cui, icd: icd.mappings?.slice(0,6) };
        sections.snomed = formatSNOMED((snomed.mappings || []).slice(0,6).map((m:any)=>({ name: m.term, code: m.code })));
      }
      if (mode==='doctor') {
        const rawTrials = await pubmedTrials(term);
        sections.trials = formatTrials(rawTrials, query);
      }
    } else if (intent === 'DRUGS_LIST') {
      const rx = await rxnormNormalize(query);
      sections.meds = rx.meds;
      if ((rx.meds||[]).length >= 2) {
        sections.interactions = (await rxnavInteractions(rx.meds.map((m:any)=>m.rxcui))).interactions;
      }
    } else if (intent === 'CLINICAL_TRIALS_QUERY') {
      const term = keywords[0] || query;
      const rawTrials = await pubmedTrials(term);
      sections.trials = formatTrials(rawTrials, query);
    }
  } catch(e:any){ sections.error = String(e?.message || e); }

  return NextResponse.json({ intent, sections, followups: makeFollowups(intent, sections, (mode==='doctor'?'doctor':'patient'), query) });
}
