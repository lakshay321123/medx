export type TrialQuery = {
  condition?: string;
  cancerType?: string;
  phase?: "1" | "2" | "3" | "4";
  recruiting?: boolean;
  country?: string;
  keywords?: string[];
};

const PHASE_RE = /\bphase\s*(I{1,3}|iv|1|2|3|4)\b/i;
const RECRUITING_RE = /\b(recruiting|active|enrolling)\b/i;
const COUNTRY_MAP: Record<string, string> = {
  india: "India",
  us: "United States",
  usa: "United States",
  uk: "United Kingdom",
  europe: "Europe",
};

const ALIAS: Record<string, string> = {
  "nonmall": "non-small",
  "non small": "non-small",
  "luekimia": "leukemia",
  "bevacizab": "bevacizumab",
  "atolizumab": "atezolizumab",
  "avin": "avastin",
  "nivolum": "nivolumab",
};

export function normalizeInput(q: string) {
  let s = " " + (q || "").toLowerCase() + " ";
  for (const [k, v] of Object.entries(ALIAS)) s = s.replaceAll(` ${k} `, ` ${v} `);
  return s.trim();
}

export function interpretTrialQuery(q: string): TrialQuery {
  const s = normalizeInput(q);

  const phaseMatch = s.match(PHASE_RE);
  const phase = phaseMatch
    ? (["i", "ii", "iii", "iv"].includes(phaseMatch[1].toLowerCase())
        ? ((["i", "ii", "iii", "iv"].indexOf(phaseMatch[1].toLowerCase()) + 1).toString() as any)
        : (phaseMatch[1] as any))
    : undefined;

  const recruiting = RECRUITING_RE.test(s) ? true : undefined;

  const countryKey = Object.keys(COUNTRY_MAP).find((k) => s.includes(k));
  const country = countryKey ? COUNTRY_MAP[countryKey] : undefined;

  const condition = extractCondition(s);
  const cancerType = extractCancerType(s);

  const keywords = extractKeywords(s, { condition, phase, country });

  return { condition, cancerType, phase, recruiting, country, keywords };
}

export function isSelfDisclosure(query: string): boolean {
  return /(i have|i was diagnosed|my diagnosis|i suffer from|i'm dealing with|i was told i have)/i.test(
    query,
  );
}

export function detectNewTopic(query: string, prevCondition?: string): boolean {
  if (!prevCondition) return true;
  const q = query.toLowerCase();
  return !q.includes(prevCondition.toLowerCase());
}

function extractCondition(s: string) {
  if (s.includes("nsclc")) return "non-small cell lung cancer";
  if (s.includes("leukemia")) return "leukemia";
  if (s.includes("lymphoma")) return "lymphoma";
  if (s.includes("breast cancer")) return "breast cancer";
  if (s.includes("lung cancer")) return "lung cancer";
  return undefined;
}
function extractCancerType(s: string) {
  if (s.includes("blood cancer")) return "hematologic malignancy";
  if (s.includes("leukemia")) return "leukemia";
  if (s.includes("lymphoma")) return "lymphoma";
  return undefined;
}
function extractKeywords(s: string, known: { condition?: string; phase?: string; country?: string }) {
  const stop = new Set<string>([
    ...(known.condition ? known.condition.split(/\s+/) : []),
    known.phase || "",
    known.country?.toLowerCase() || "",
    "phase",
    "trial",
    "trials",
    "clinical",
    "cancer",
    "worldwide",
    "latest",
    "recruiting",
  ]);
  return s
    .split(/[^a-z0-9+]/i)
    .filter((w) => w && !stop.has(w))
    .slice(0, 5);
}
