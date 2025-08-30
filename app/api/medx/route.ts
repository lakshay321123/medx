import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.LLM_BASE_URL!;
const MODEL = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
const KEY   = process.env.LLM_API_KEY!;

async function classifyIntent(query: string, mode: 'patient'|'doctor') {
  const sys = `Classify a medical query into ONE:
- DIAGNOSIS_QUERY (map to ICD-10, SNOMED; trials if doctor)
- DRUGS_LIST (extract meds; check interactions)
- CLINICAL_TRIALS_QUERY (fetch trials)
- NEARBY                 (find nearby healthcare places like doctor/clinic/hospital/pharmacy)
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

async function umlsSearch(api: (path:string)=>string, term: string){
  const res = await fetch(api(`/api/umls/search?q=${encodeURIComponent(term)}`));
  return res.ok ? res.json() : { results: [] };
}
async function umlsCrosswalk(api: (path:string)=>string, cui: string, target:'ICD10CM'|'SNOMEDCT_US'|'RXNORM'){
  const res = await fetch(api(`/api/umls/crosswalk?cui=${encodeURIComponent(cui)}&target=${target}`));
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
async function rxnormNormalize(api: (path:string)=>string, text: string){
  const r = await fetch(api('/api/rxnorm/normalize'),{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text })
  });
  return r.ok ? r.json() : { meds: [] };
}
async function rxnavInteractions(api: (path:string)=>string, rxcuis: string[]){
  const r = await fetch(api('/api/interactions'),{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rxcuis })
  });
  return r.ok ? r.json() : { interactions: [] };
}

function topicFrom(sections: any, fallback: string) {
  return sections?.topic || sections?.codes?.icd?.[0]?.name || sections?.codes?.snomed?.[0]?.name || sections?.meds?.[0]?.name || fallback;
}
function makeFollowups(intent: string, sections: any, mode: 'patient'|'doctor', query: string): string[] {
  const topic = topicFrom(sections, query || 'this condition');
  const f: string[] = [];
  if (intent === 'NEARBY') f.push(`Directions to the closest`, `Show more within 10 km`, `Open now`);
  if (intent === 'DRUGS_LIST') {
    if ((sections?.interactions?.length || 0) > 0) f.push(`Explain these interactions simply`, `Are there safer alternatives for ${topic}?`);
    else f.push(`Check interactions for these medicines`);
    f.push(`Trusted sources for ${topic} medicines`);
  }
  if (intent === 'DIAGNOSIS_QUERY' || intent === 'GENERAL_HEALTH') {
    if (mode === 'doctor') f.push(`Latest clinical trials for ${topic}`, `Common ICD-10 codes for ${topic}`, `SNOMED terms for ${topic}`, `Trusted sources for ${topic}`);
    else f.push(`What tests are usually done for ${topic}?`, `Trusted sources for ${topic}`, `Lifestyle changes that help ${topic}`, `Questions to ask my doctor about ${topic}`);
  }
  if ((sections?.trials?.length || 0) > 0) f.push(`Summarize trial eligibility for ${topic}`, `Any phase 3 results for ${topic}?`);
  return Array.from(new Set(f)).slice(0, 6);
}

export async function POST(req: NextRequest) {
  // Edge-safe absolute URL builder for internal routes
  const origin = req.nextUrl?.origin || process.env.NEXT_PUBLIC_BASE_URL || '';
  const api = (path: string) => /^https?:\/\//i.test(path) ? path : new URL(path, origin).toString();

  const { query, mode, coords, forceIntent, prior } = await req.json();
  if (!query) return NextResponse.json({ intent: 'GENERAL_HEALTH', sections: {} });

  const cls = forceIntent
    ? { intent: forceIntent, keywords: [] }
    : await classifyIntent(query, mode === 'doctor' ? 'doctor' : 'patient');

  const intent = cls.intent || 'GENERAL_HEALTH';
  const keywords: string[] = cls.keywords || [];
  const sections: any = {};

  try {
    if (intent === 'NEARBY') {
      const kind = (cls.keywords?.[0] || query || '').toString();
      if (process.env.FEATURE_NEARBY !== 'on') {
        sections.nearby = { disabled: true, reason: 'FEATURE_NEARBY is off' };
      } else if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        sections.needsLocation = true; sections.kind = kind;
      } else {
        const r = await fetch(api('/api/nearby'), {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ lat: coords.lat, lng: coords.lng, kind })
        });
        sections.nearby = await r.json();
      }
    } else if (intent === 'DIAGNOSIS_QUERY') {
      const term = keywords[0] || query;
      const s = await umlsSearch(api, term);
      const cui = s.results?.[0]?.ui || null;
      if (cui) {
        const icd = await umlsCrosswalk(api, cui, 'ICD10CM');
        const snomed = await umlsCrosswalk(api, cui, 'SNOMEDCT_US');
        sections.codes = { cui, icd: icd.mappings?.slice(0,6), snomed: snomed.mappings?.slice(0,6) };
      }
      if (mode === 'doctor') sections.trials = await pubmedTrials(term);
    } else if (intent === 'DRUGS_LIST') {
      const rx = await rxnormNormalize(api, query);
      sections.meds = rx.meds;
      if ((rx.meds || []).length >= 2) {
        sections.interactions = (await rxnavInteractions(api, rx.meds.map((m:any)=>m.rxcui))).interactions;
      }
    } else if (intent === 'CLINICAL_TRIALS_QUERY') {
      const term = keywords[0] || query;
      sections.trials = await pubmedTrials(term);
    }
  } catch (e: any) { sections.error = String(e?.message || e); }

  const mergedContext = { ...(prior || {}), ...(sections || {}) };

  return NextResponse.json({
    intent,
    sections,
    followups: makeFollowups(intent, mergedContext, (mode === 'doctor' ? 'doctor' : 'patient'), query)
  });
}
