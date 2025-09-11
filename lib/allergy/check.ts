import fs from 'fs/promises';
import path from 'path';

interface AllergyRule {
  allergen: string;
  cross: string[];
  severity: string;
  reference: string;
}

export interface AllergyRecord {
  item: string;
  risk: string;
  severity: string;
  reference: string;
}

export interface AllergyCheckResult {
  allergyCheck: AllergyRecord[];
  note: string;
}

const ALLERGENS_PATH = process.env.ALLERGENS_DATA_PATH || path.join(process.cwd(), 'data/allergens.json');
const DRUG_CLASSES_PATH = process.env.DRUG_CLASSES_DATA_PATH || path.join(process.cwd(), 'data/drug_classes.json');

let cachedRules: AllergyRule[] | null = null;

async function loadRules(): Promise<AllergyRule[]> {
  if (cachedRules) return cachedRules;
  const readJson = async (p: string) => {
    try {
      const raw = await fs.readFile(p, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data as AllergyRule[] : [];
    } catch {
      return [];
    }
  };
  const [foods, drugs] = await Promise.all([
    readJson(ALLERGENS_PATH),
    readJson(DRUG_CLASSES_PATH)
  ]);
  cachedRules = [...foods, ...drugs].map(r => ({
    allergen: r.allergen.toLowerCase(),
    cross: (r.cross || []).map(c => c.toLowerCase()),
    severity: r.severity || 'unknown',
    reference: r.reference || ''
  }));
  return cachedRules;
}

function normalize(arr: string[]): string[] {
  return arr.filter(Boolean).map(a => a.trim().toLowerCase());
}

function title(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export async function checkAllergies(items: string[], allergies: string[]): Promise<AllergyCheckResult> {
  const enabled = (process.env.ALLERGY_CHECKER || 'true').toLowerCase() === 'true';
  if (!enabled) return { allergyCheck: [], note: 'Allergy checker disabled' };

  const rules = await loadRules();
  const ruleMap: Record<string, AllergyRule> = {};
  for (const r of rules) ruleMap[r.allergen] = r;

  const normItems = normalize(items);
  const normAllergies = normalize(allergies);

  const out: AllergyRecord[] = [];
  for (const it of normItems) {
    let matched = false;

    // direct allergen check if no allergies on file
    if (!normAllergies.length && ruleMap[it]) {
      const r = ruleMap[it];
      out.push({
        item: title(it),
        risk: 'Common allergen',
        severity: r.severity,
        reference: r.reference
      });
      matched = true;
    }

    for (const al of normAllergies) {
      const r = ruleMap[al];
      if (r && (r.cross || []).includes(it)) {
        out.push({
          item: title(it),
          risk: `Possible cross-reactivity with ${title(al)} allergy`,
          severity: r.severity,
          reference: r.reference
        });
        matched = true;
      }
    }

    if (!matched) {
      out.push({
        item: title(it),
        risk: 'No data available',
        severity: 'unknown',
        reference: ''
      });
    }
  }

  const note = normAllergies.length
    ? 'Screening based on recorded allergies. Consult a professional for medical advice.'
    : 'No allergies on file. Add allergies for personalized checks.';

  return { allergyCheck: out, note };
}
