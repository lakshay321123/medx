import fs from 'fs/promises';
import path from 'path';

interface Rule { allergen: string; cross: string[]; }

let cached: Rule[] | null = null;
async function loadRules(): Promise<Rule[]> {
  if (cached) return cached;
  const p = process.env.DRUG_CLASSES_DATA_PATH || path.join(process.cwd(), 'data/drug_classes.json');
  try {
    const raw = JSON.parse(await fs.readFile(p, 'utf8'));
    cached = Array.isArray(raw) ? raw.map(r => ({ allergen: r.allergen.toLowerCase(), cross: (r.cross || []).map((c: string) => c.toLowerCase()) })) : [];
  } catch {
    cached = [];
  }
  return cached;
}

function norm(s: string) { return s.trim().toLowerCase(); }
function title(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export async function checkMedicationAllergies(allergies: string[], meds: { name: string }[], region = '') {
  const rules = await loadRules();
  const map: Record<string, Rule> = {};
  for (const r of rules) map[r.allergen] = r;

  const normAll = allergies.map(norm);
  const expanded = new Set<string>();
  for (const a of normAll) {
    expanded.add(a);
    const r = map[a];
    if (r) for (const c of r.cross) expanded.add(c);
  }

  const conflicts: any[] = [];
  const safe: any[] = [];

  for (const m of meds) {
    const active = norm(m.name.split(/\s+/)[0]);
    let conflictReason: string | null = null;
    for (const a of normAll) {
      const r = map[a];
      if (active === a) {
        conflictReason = `${title(a)}-class allergy`;
        break;
      }
      if (r && r.cross.includes(active)) {
        conflictReason = `${title(a)}-class allergy`;
        break;
      }
    }
    if (conflictReason) {
      conflicts.push({ med: m.name, actives: [active], reason: conflictReason });
    } else {
      safe.push({ med: m.name, actives: [active] });
    }
  }

  return {
    meta: { region },
    conflicts,
    safe,
    notes: ['Cross-reactivity checked via class map']
  };
}
