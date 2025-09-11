const ENABLED = (process.env.DRUG_INTERACTIONS_ENABLED || 'false').toLowerCase() === 'true';
import fs from 'fs/promises';
import path from 'path';

const RULES_PATH = process.env.DRUG_INTERACTION_RULES_PATH || path.join(process.cwd(), 'data/drug_interactions.json');

export interface InteractionRecord {
  pair: string;
  severity: string;
  note: string;
  reference: string;
}

export interface InteractionResult {
  interactions: InteractionRecord[];
  note?: string;
}

async function normalizeDrug(name: string): Promise<{ name: string; rxcui: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { name: '', rxcui: null };
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(trimmed)}&search=2`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      const j = await res.json();
      const rx = j?.idGroup?.rxnormId?.[0] || null;
      const nm = j?.idGroup?.name || trimmed;
      return { name: nm.toLowerCase(), rxcui: rx };
    }
  } catch {}
  return { name: trimmed.toLowerCase(), rxcui: null };
}

async function loadRules(): Promise<any[]> {
  try {
    const raw = await fs.readFile(RULES_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
  } catch {}
  return [];
}

function capitalize(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export async function checkDrugInteractions(meds: string[]): Promise<InteractionResult | null> {
  if (!ENABLED) return null;
  const normed = (await Promise.all(meds.map(normalizeDrug))).filter(m => m.name);
  const dedupMap: Record<string, { name: string; rxcui: string | null }> = {};
  for (const m of normed) {
    const key = m.rxcui || m.name;
    if (!dedupMap[key]) dedupMap[key] = m;
  }
  const dedup = Object.values(dedupMap);
  if (dedup.length < 2) {
    return { interactions: [], note: 'No major interactions known.' };
  }

  const rules = await loadRules();
  const out: InteractionRecord[] = [];
  const names = dedup.map(m => m.name);

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const pair = [names[i], names[j]].sort();
      const rule = rules.find(r => {
        if (!Array.isArray(r.drugs) || r.drugs.length !== 2) return false;
        const d = r.drugs.map((d: string) => String(d).toLowerCase()).sort();
        return d[0] === pair[0] && d[1] === pair[1];
      });
      if (rule) {
        const record: InteractionRecord = {
          pair: `${capitalize(pair[0])} + ${capitalize(pair[1])}`,
          severity: rule.severity || 'Unknown',
          note: rule.note || '',
          reference: rule.reference || 'https://rxnav.nlm.nih.gov'
        };
        out.push(record);
      }
    }
  }

  if (out.length) {
    const major = out.some(i => i.severity.toLowerCase() === 'major');
    console.log('metric_drug_interactions_major', { major });
    const uniq: Record<string, InteractionRecord> = {};
    for (const r of out) { uniq[r.pair] = r; }
    return { interactions: Object.values(uniq) };
  }

  const rxcuis = dedup.map(m => m.rxcui).filter(Boolean) as string[];
  if (rxcuis.length < 2) {
    return { interactions: [], note: rules.length ? 'No major interactions known.' : 'Interaction data unavailable.' };
  }
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${encodeURIComponent(rxcuis.join('+'))}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      const data = await res.json();
      for (const g of data.fullInteractionTypeGroup || []) {
        for (const t of g.fullInteractionType || []) {
          const names = (t.minConcept || []).map((c: any) => String(c.name || '').toLowerCase());
          for (const p of t.interactionPair || []) {
            const pair = names.sort().map(capitalize).join(' + ');
            out.push({
              pair,
              severity: p.severity,
              note: p.description,
              reference: 'https://rxnav.nlm.nih.gov'
            });
          }
        }
      }
      if (out.length) {
        const major = out.some(i => i.severity.toLowerCase() === 'major');
        console.log('metric_drug_interactions_major', { major });
        const uniq: Record<string, InteractionRecord> = {};
        for (const r of out) { uniq[r.pair] = r; }
        return { interactions: Object.values(uniq) };
      }
      return { interactions: [], note: 'No major interactions known.' };
    }
  } catch {}
  return { interactions: [], note: 'Interaction data unavailable.' };
}

