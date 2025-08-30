import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.LLM_BASE_URL!;
const MODEL = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
const KEY   = process.env.LLM_API_KEY!;

const baseSystemPrompt = 'You are a medical AI assistant.';

// --- Doctor Planner: decide what to fetch BEFORE answering ---
const TRIAL_KEYWORDS = /\b(trial|nct\d{8}|phase\s*[1-4]|randomi[sz]ed|enrol(l)?|eligibilit(y|ies)|arm(s)?|investigational|intervention|cohort)\b/i;
const CODES_KEYWORDS = /\b(icd|icd-10|icd10|icd-11|icd11|snomed|snomed ct|coding|codes?)\b/i;

function normalizeTopic(q: string) {
  return (q || '').replace(/\b(latest|recent|new|info|about|detail|explain|overview)\b/gi,'').trim();
}

function decideDoctorIntent(query: string) {
  const q = query || '';
  const topic = normalizeTopic(q);
  // If they explicitly mention trials keywords → trials
  if (TRIAL_KEYWORDS.test(q)) return { intent: 'TRIALS_QUERY', topic, wantTrials: true, wantCodes: false };
  // If they explicitly ask codes → codes
  if (CODES_KEYWORDS.test(q)) return { intent: 'CODES_QUERY', topic, wantTrials: false, wantCodes: true };
  // Default for broad terms → overview + codes, NO trials
  return { intent: 'DOCTOR_OVERVIEW', topic, wantTrials: false, wantCodes: true };
}

// Extra safety: never pull trials unless the planner says so
function shouldFetchTrials(mode: string, planner: {wantTrials:boolean}) {
  return mode === 'doctor' && planner?.wantTrials === true;
}

// Policy text we inject into the LLM for doctor mode
function doctorPolicy(planner: {wantTrials:boolean, topic:string}) {
  const lines = [
    "Doctor-Mode Policy:",
    "- If the user did NOT explicitly ask about clinical trials, DO NOT include trials.",
    "- Prefer concise medical overview, differential if relevant, and standardized codes (ICD-10/11, SNOMED).",
    "- Use neutral, clinical tone. Avoid patient-level hand-holding unless asked.",
    "- When asked for trials (explicitly), summarize key trials briefly and provide links; otherwise suggest a follow-up chip."
  ];
  if (!planner.wantTrials) lines.push("- The user did not ask trials: exclude any trials mention in your answer.");
  return lines.join("\n");
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

function makeDoctorFollowups(planner: any) {
  const t = planner?.topic || 'this condition';
  const f: string[] = [
    `Common ICD-10 codes for ${t}`,
    `SNOMED terms for ${t}`,
    `Trusted guidelines for ${t}`
  ];
  // Offer trials as a click, not by default
  f.push(`Show latest clinical trials for ${t}`);
  return Array.from(new Set(f)).slice(0,5);
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
  const { query, mode, coords, forceIntent, prior } = await req.json();
  if(!query) return NextResponse.json({ intent:'GENERAL_HEALTH', sections:{} });

  let planner = null as null | { intent:string; topic:string; wantTrials:boolean; wantCodes:boolean };
  if (mode === 'doctor') {
    planner = decideDoctorIntent(query);
  }

  const cls = forceIntent ? { intent: forceIntent, keywords: [] } : await classifyIntent(query, mode==='doctor'?'doctor':'patient');
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
      if (mode === 'doctor') {
        if (shouldFetchTrials(mode, planner!)) {
          sections.trials = await pubmedTrials(term);
        }
      }
    } else if (intent === 'DRUGS_LIST') {
      const rx = await rxnormNormalize(query);
      sections.meds = rx.meds;
      if ((rx.meds||[]).length >= 2) {
        sections.interactions = (await rxnavInteractions(rx.meds.map((m:any)=>m.rxcui))).interactions;
      }
    } else if (intent === 'CLINICAL_TRIALS_QUERY') {
      const term = keywords[0] || query;
      if (mode === 'doctor') {
        if (shouldFetchTrials(mode, planner!)) {
          sections.trials = await pubmedTrials(term);
        }
      } else {
        sections.trials = await pubmedTrials(term);
      }
    }
  } catch(e:any){ sections.error = String(e?.message || e); }

  if (mode === 'doctor' && planner?.wantCodes) {
    sections.topic = planner.topic || query;
    try {
      const cuiRes = await umlsSearch(sections.topic);
      const cui = cuiRes?.results?.[0]?.ui || cuiRes?.cui;
      const icdRes = cui ? await umlsCrosswalk(cui,'ICD10CM') : null;
      const snomedRes = cui ? await umlsCrosswalk(cui,'SNOMEDCT_US') : null;
      sections.codes = {
        icd: Array.isArray(icdRes?.mappings) ? icdRes.mappings.slice(0,6) : [],
        snomed: Array.isArray(snomedRes?.mappings) ? snomedRes.mappings.slice(0,6) : []
      };
    } catch(_e) {
      sections.codes = sections.codes || {};
    }
  }

  const mergedContext = { ...(prior || {}), ...(sections || {}) };
  const contextBlock = "CONTEXT:\n" + JSON.stringify(mergedContext, null, 2);

  let sys = baseSystemPrompt;
  if (mode === 'doctor' && planner) {
    sys += "\n\n" + doctorPolicy(planner);
  }

  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: `${query}\n\n${contextBlock}` }
  ];

  const r = await fetch(`${BASE.replace(/\/$/,'')}/chat/completions`,{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},
    body: JSON.stringify({ model: MODEL, temperature: 0, messages })
  });
  const j = await r.json();
  const answer = j.choices?.[0]?.message?.content || '';
  sections.answer = answer;

  let followups = makeFollowups(intent, sections, (mode==='doctor'?'doctor':'patient'), query);
  if (mode === 'doctor' && planner) {
    followups = makeDoctorFollowups(planner);
  }

  return NextResponse.json({ intent: planner?.intent || intent, sections, followups });
}
