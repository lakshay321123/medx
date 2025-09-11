import fs from 'fs';
import path from 'path';

export type LabExplainer = {
  name: string;
  purpose: string;
  adult_range: string;
  high_means: string[];
  low_means: string[];
  prep: string[];
  references: string[];
};

type Metrics = { hits: number; misses: number };
const metrics: Metrics = { hits: 0, misses: 0 };

let cache: Record<string, LabExplainer> | null = null;

function normalize(name: string) {
  return name.trim().toLowerCase();
}

function loadCache() {
  if (cache) return cache;
  cache = {};
  const dir = path.join(process.cwd(), 'data', 'labs');
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return cache;
  }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
      const expl: LabExplainer = {
        name: raw.name,
        purpose: raw.purpose,
        adult_range: raw.adult_range,
        high_means: raw.high_means || [],
        low_means: raw.low_means || [],
        prep: raw.prep || [],
        references: raw.references || [],
      };
      const keys = [raw.name, ...(raw.aliases || [])];
      for (const k of keys) {
        cache[normalize(String(k))] = expl;
      }
    } catch {
      // ignore bad file
    }
  }
  return cache;
}

export function explainLabTest(testName: string): LabExplainer | null {
  const map = loadCache();
  const key = normalize(testName);
  const found = map[key];
  if (found) {
    metrics.hits++;
    return found;
  }
  metrics.misses++;
  return null;
}

export function getLabExplainerMetrics() {
  return metrics;
}
