export type Cite = { url: string; title?: string; kind?: string };

type MaybeArray = any[] | null | undefined;
type MaybeMap = Record<string, any> | null | undefined;

const arrayLikeKeys = ["citations", "sources", "references", "refs"];
const mapKeys = ["citationsMap", "citations", "sources", "references", "refs"];

function toCite(entry: any): Cite | null {
  if (!entry) return null;
  if (typeof entry === "string") {
    const url = entry.trim();
    return url ? { url } : null;
  }
  if (typeof entry !== "object") return null;
  const url =
    typeof entry.url === "string" && entry.url.trim()
      ? entry.url.trim()
      : typeof entry.href === "string" && entry.href.trim()
      ? entry.href.trim()
      : typeof entry.link === "string" && entry.link.trim()
      ? entry.link.trim()
      : null;
  if (!url) return null;
  const titleCandidate =
    typeof entry.title === "string"
      ? entry.title
      : typeof entry.label === "string"
      ? entry.label
      : typeof entry.name === "string"
      ? entry.name
      : typeof entry.text === "string"
      ? entry.text
      : undefined;
  const kindCandidate =
    typeof entry.kind === "string"
      ? entry.kind
      : typeof entry.source === "string"
      ? entry.source
      : typeof entry.type === "string"
      ? entry.type
      : undefined;
  return {
    url,
    title: titleCandidate,
    kind: kindCandidate,
  };
}

function collect(items: MaybeArray, seen: Set<string>): Cite[] | null {
  if (!Array.isArray(items)) return null;
  const out: Cite[] = [];
  for (const item of items) {
    const cite = toCite(item);
    if (!cite) continue;
    const key = cite.url.trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(cite);
    }
  }
  return out.length ? out : null;
}

function collectMap(map: MaybeMap, seen: Set<string>): Cite[] | null {
  if (!map || typeof map !== "object" || Array.isArray(map)) return null;
  const keys = Object.keys(map);
  if (!keys.length) return null;
  const sorted = keys.sort((a, b) => Number(a) - Number(b));
  const items = sorted.map((k) => (map as Record<string, any>)[k]);
  return collect(items, seen);
}

export function normalizeCitations(payload: any): Cite[] {
  const seen = new Set<string>();

  // payload itself might be an array of citations
  const direct = collect(payload, seen);
  if (direct) return direct;

  for (const key of arrayLikeKeys) {
    const picked = collect(payload?.[key], seen);
    if (picked) return picked;
  }

  for (const key of mapKeys) {
    const picked = collectMap(payload?.[key], seen);
    if (picked) return picked;
  }

  // Look for nested map under payload?.citations?.map style structures
  if (payload && typeof payload === "object") {
    for (const key of mapKeys) {
      const candidate = payload[key];
      if (candidate && typeof candidate === "object") {
        const nested = collect(candidate?.items as MaybeArray, seen);
        if (nested) return nested;
      }
    }
  }

  return [];
}
