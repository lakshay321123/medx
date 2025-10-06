import { firstText, parseXml } from "./xml";

const EUCTR_URL = "https://www.clinicaltrialsregister.eu/ctr-search/rest/search";

export async function fetchEUCTR(query?: string): Promise<any[]> {
  const url = `${EUCTR_URL}?query=${encodeURIComponent(query || "")}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const text = await res.text();

  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data.map(mapEuctrJson).filter(filterValid) : [];
  } catch {
    return parseEuctrXml(text);
  }
}

function mapEuctrJson(record: any) {
  const id = record?.eudractNumber || record?.trialNumber || record?.id;
  const countries = normalizeCountryArray(record?.memberStatesConcerned || record?.countries);
  return {
    id,
    title: record?.scientificTitle || record?.fullTitle || record?.title,
    url: id ? `https://www.clinicaltrialsregister.eu/ctr-search/trial/${id}` : undefined,
    phase: record?.trialPhase || record?.phase,
    status: record?.trialStatus || record?.status,
    country: countries[0],
    source: "EUCTR" as const,
  };
}

function parseEuctrXml(raw: string) {
  const xml = parseXml(raw);
  if (!xml || typeof xml !== "object") return [];

  const trialsNode = xml.result ?? xml.results ?? xml.trial ?? xml;
  const trialList = normalizeTrialArray(trialsNode, ["trial", "Trial"]);

  return trialList
    .map((node) => {
      const id = pick(node, ["EudraCTNumber", "eudractNumber", "trialNumber", "id"]);
      const countries = normalizeCountryArray(node?.country ?? node?.countries ?? node?.memberStatesConcerned);
      const urlId = pick(node, ["EudraCTNumber", "eudractNumber", "trialNumber", "id"]);
      return {
        id,
        title: pick(node, ["scientificTitle", "ScientificTitle", "fullTitle", "title"]),
        url: urlId ? `https://www.clinicaltrialsregister.eu/ctr-search/trial/${urlId}` : undefined,
        phase: pick(node, ["trialPhase", "TrialPhase", "phase"]),
        status: pick(node, ["trialStatus", "TrialStatus", "status"]),
        country: countries[0],
        source: "EUCTR" as const,
      };
    })
    .filter(filterValid);
}

function normalizeTrialArray(root: any, childKeys: string[]) {
  const direct = Array.isArray(root) ? root : root && typeof root === "object" ? [root] : [];
  if (direct.length && typeof direct[0] === "object" && !childKeys.some((key) => key in direct[0])) {
    return direct;
  }
  for (const key of childKeys) {
    const value = root?.[key];
    if (value) {
      return Array.isArray(value) ? value : [value];
    }
  }
  return [];
}

function normalizeCountryArray(value: any): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value].filter(Boolean);
  if (Array.isArray(value)) {
    return value
      .map((v) => firstText(v))
      .filter((v): v is string => Boolean(v));
  }
  if (typeof value === "object") {
    return Object.values(value)
      .flatMap((entry) => normalizeCountryArray(entry))
      .filter((v): v is string => Boolean(v));
  }
  return [];
}

function pick(record: any, keys: string[]): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  for (const key of keys) {
    const value = record[key];
    const resolved = firstText(value);
    if (resolved) return resolved;
  }
  return undefined;
}

function filterValid(trial: { id?: string; title?: string }) {
  return Boolean(trial?.id || trial?.title);
}
