import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.LLM_BASE_URL!;
const MODEL = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
const KEY   = process.env.LLM_API_KEY!;

// ===== Doctor-mode planning & policies =====
const TRIAL_KEYWORDS = /\b(trial|nct\d{8}|phase\s*[1-4]|randomi[sz]ed|enrol(l)?|eligibilit(y|ies)|arm[s]?|investigational|intervention|cohort)\b/i;
const CODES_KEYWORDS = /\b(icd|icd-10|icd10|icd-11|icd11|snomed|snomed ct|coding|codes?)\b/i;

function normalizeTopic(q: string) {
  return (q || '').replace(/\b(latest|recent|new|info|about|detail|explain|overview)\b/gi,'').trim();
}

function decideDoctorIntent(query: string) {
  const q = query || '';
  const topic = normalizeTopic(q);
  if (TRIAL_KEYWORDS.test(q)) return { intent: 'TRIALS_QUERY', topic, wantTrials: true, wantCodes: true };
  if (CODES_KEYWORDS.test(q)) return { intent: 'CODES_QUERY', topic, wantTrials: false, wantCodes: true };
  return { intent: 'DOCTOR_OVERVIEW', topic, wantTrials: false, wantCodes: true };
}

// Stronger topic relevance for cancer (prevents liver/hemophilia/etc)
function isCancerTrial(trial:any) {
  const title = (trial?.title || '').toLowerCase();
  const conds = (trial?.conditions || []).join(' ').toLowerCase();
  return /(cancer|oncology|tumou?r|carcinoma|sarcoma|lymphoma|leukemia|myeloma)/.test(title + ' ' + conds);
}

// Add a prose policy to stop the LLM from listing trials in text
function prosePolicy({ mode, planner, trialsPresent }: { mode: string; planner?: any; trialsPresent?: boolean }) {
  const lines = [
    "General Policy:",
    "- Be concise, structured, and clinically neutral.",
  ];
  if (mode === 'doctor') {
    lines.push(
      "Doctor-Mode Policy:",
      "- Prioritize overview, differentials when relevant, and standardized coding (ICD-10/11, SNOMED)."
    );
    if (!planner?.wantTrials) {
      lines.push("- The user did NOT ask about clinical trials: DO NOT include trials in your prose.");
    }
  }
  if (trialsPresent) {
    lines.push("- Trials are rendered separately below; DO NOT list trials again in prose. You may reference them as 'see trials below'.");
  }
  return lines.join("\n");
}

const baseSystemPrompt = 'You are a clinical assistant. Be precise and clinically neutral.';

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

function makeDoctorFollowups(topic: string) {
  const t = topic || 'this condition';
  return [
    `Common ICD-10 codes for ${t}`,
    `SNOMED terms for ${t}`,
    `Trusted guidelines for ${t}`,
    `Show latest clinical trials for ${t}`
  ];
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
  // (keep your absolute URL helper here)
  const origin = req.nextUrl?.origin || process.env.NEXT_PUBLIC_BASE_URL || '';
  const api = (path: string) => /^https?:\/\//i.test(path) ? path : new URL(path, origin).toString();

  const { query, mode, coords, forceIntent, prior } = await req.json();

  // --- Doctor planner ---
  let planner: null | { intent:string; topic:string; wantTrials:boolean; wantCodes:boolean } = null;
  if (mode === 'doctor') {
    planner = decideDoctorIntent(query);
  }

  if(!query) return NextResponse.json({ intent: planner?.intent || 'GENERAL_HEALTH', sections:{} });

  const cls = await classifyIntent(query, mode==='doctor'?'doctor':'patient');
  const intent = cls.intent || 'GENERAL_HEALTH';
  const keywords: string[] = cls.keywords || [];
  const sections: any = {};

  // Prefer codes in Doctor mode (best-effort)
  if (mode === 'doctor' && planner?.wantCodes) {
    try {
      sections.topic = planner.topic || query;
      const cuiRes = await fetch(api(`/api/umls/search?q=${encodeURIComponent(sections.topic)}`));
      const cuiJson = await cuiRes.json();
      const cui = cuiJson?.results?.[0]?.cui || cuiJson?.cui;

      if (cui) {
        const icdRes = await fetch(api(`/api/umls/crosswalk?cui=${encodeURIComponent(cui)}&target=ICD10CM`));
        const snomedRes = await fetch(api(`/api/umls/crosswalk?cui=${encodeURIComponent(cui)}&target=SNOMEDCT`));
        const icd = await icdRes.json().catch(()=>null);
        const snomed = await snomedRes.json().catch(()=>null);
        sections.codes = {
          icd: Array.isArray(icd?.codes) ? icd.codes.slice(0,6) : [],
          snomed: Array.isArray(snomed?.codes) ? snomed.codes.slice(0,6) : []
        };
      }
    } catch { /* silent */ }
  }

  try {
    if (intent === 'DIAGNOSIS_QUERY') {
      const term = keywords[0] || query;
      const s = await umlsSearch(term);
      const cui = s.results?.[0]?.ui || null;
      if (cui) {
        const icd = await umlsCrosswalk(cui,'ICD10CM');
        const snomed = await umlsCrosswalk(cui,'SNOMEDCT_US');
        sections.codes = sections.codes || { cui };
        sections.codes.icd = sections.codes.icd || icd.mappings?.slice(0,6);
        sections.codes.snomed = sections.codes.snomed || snomed.mappings?.slice(0,6);
      }
      // Example placement where you build trials
      if (mode === 'doctor') {
        if (planner?.wantTrials) {
          let rawTrials = await pubmedTrials(term);
          if (/^cancer$/i.test(planner.topic || term || '')) {
            rawTrials = Array.isArray(rawTrials) ? rawTrials.filter(isCancerTrial) : [];
          }
          sections.trials = rawTrials;
        } else {
          // sections.trials remains undefined
        }
      } else {
        sections.trials = await pubmedTrials(term);
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
        if (planner?.wantTrials) {
          let rawTrials = await pubmedTrials(term);
          if (/^cancer$/i.test(planner.topic || term || '')) {
            rawTrials = Array.isArray(rawTrials) ? rawTrials.filter(isCancerTrial) : [];
          }
          sections.trials = rawTrials;
        }
      } else {
        sections.trials = await pubmedTrials(term);
      }
    }
  } catch(e:any){ sections.error = String(e?.message || e); }

  const mergedContext = { ...(prior || {}), ...(sections || {}) };
  const contextBlock = "CONTEXT:\n" + JSON.stringify(mergedContext, null, 2);

  let sys = baseSystemPrompt;
  sys += "\n\n" + prosePolicy({
    mode: mode || 'patient',
    planner,
    trialsPresent: Array.isArray(sections?.trials) && sections.trials.length > 0
  });

  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: `${query}\n\n${contextBlock}` }
  ];

  const completion = await fetch(`${BASE.replace(/\/$/,'')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: 0, messages })
  });
  const completionJson = await completion.json();
  const answer = completionJson?.choices?.[0]?.message?.content || '';

  let followups: string[] = [];
  if (mode === 'doctor' && planner) {
    followups = makeDoctorFollowups(planner.topic);
  } else {
    followups = makeFollowups(intent, sections, (mode==='doctor'?'doctor':'patient'), query);
  }

  return NextResponse.json({ intent: planner?.intent || intent, sections, followups, answer });
}
