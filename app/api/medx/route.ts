import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.LLM_BASE_URL!;
const MODEL = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
const KEY   = process.env.LLM_API_KEY!;

const NCT_RE = /\bNCT\d{8}\b/i;

function extractNctId(s: string): string | null {
  const m = NCT_RE.exec(s || '');
  return m ? m[0].toUpperCase() : null;
}

function extractNctFromLink(link?: string) {
  if (!link) return '';
  const m = /NCT\d{8}/i.exec(link);
  return m ? m[0].toUpperCase() : '';
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
    const top = sections.trials.find((t:any)=>t.nctId) || sections.trials[0];
    if (top?.nctId) {
      out.push(`Show eligibility for ${top.nctId}`, `Contact sites for ${top.nctId}`);
    }
    out.push('View more trials on ClinicalTrials.gov');
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
  return ids.map((id:string, i:number)=>({
    id: `trial-${i+1}`,
    nctId: extractNctFromLink(`https://pubmed.ncbi.nlm.nih.gov/${id}/`),
    title: j.result?.[id]?.title || 'Untitled trial',
    link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    source:'PubMed'
  }));
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
  const origin = req.nextUrl?.origin || process.env.NEXT_PUBLIC_BASE_URL || '';
  const api = (path: string) => /^https?:\/\//i.test(path) ? path : new URL(path, origin).toString();

  const { query, mode, coords: _coords, forceIntent: _forceIntent, prior: _prior } = await req.json();

  // --- Trial deep-dive follow-ups ---
  if (/show (full )?eligibility/i.test(query) && NCT_RE.test(query)) {
    const nctId = extractNctId(query)!;
    const r = await fetch(api(`/api/trials/${nctId}`));
    const details = await r.json();
    return NextResponse.json({
      intent: 'TRIAL_ELIGIBILITY',
      sections: { trial: details },
      followups: [
        `Contact sites for ${nctId}`,
        `View ${nctId} on ClinicalTrials.gov`,
      ]
    });
  }

  if (/contact (site|sites|locations)/i.test(query) && NCT_RE.test(query)) {
    const nctId = extractNctId(query)!;
    const r = await fetch(api(`/api/trials/${nctId}`));
    const details = await r.json();
    const locs = Array.isArray(details?.locations) ? details.locations.slice(0, 10) : [];
    return NextResponse.json({
      intent: 'TRIAL_CONTACTS',
      sections: { trialContacts: { nctId, locations: locs } },
      followups: [
        `Show eligibility for ${nctId}`,
        `View ${nctId} on ClinicalTrials.gov`,
      ]
    });
  }

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

  return NextResponse.json({ intent, sections, followups: makeFollowups(intent, sections, (mode==='doctor'?'doctor':'patient'), query) });
}
