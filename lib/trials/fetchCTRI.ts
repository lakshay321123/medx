import { firstText, parseXml } from "./xml";

const CTRI_URL = "https://ctri.nic.in/Clinicaltrials/services/Searchdata";

export async function fetchCTRI(title?: string): Promise<any[]> {
  const url = `${CTRI_URL}?trialno=&title=${encodeURIComponent(title || "")}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const text = await res.text();

  try {
    const json = JSON.parse(text);
    return Array.isArray(json) ? json.map(mapCtri).filter(filterValid) : [];
  } catch {
    return parseCtriXml(text);
  }
}

function mapCtri(record: any) {
  const id = record?.ctriNumber || record?.TrialNumber || record?.trialno;
  return {
    id,
    title: record?.PublicTitle || record?.ScientificTitle || record?.title,
    url: id ? `https://ctri.nic.in/Clinicaltrials/pview2.php?trialid=${encodeURIComponent(id)}` : undefined,
    phase: record?.Phase,
    status: record?.RecruitmentStatus,
    country: "India",
    source: "CTRI" as const,
  };
}

function parseCtriXml(raw: string) {
  const xml = parseXml(raw);
  if (!xml || typeof xml !== "object") return [];

  const trialsNode = xml.Trials ?? xml.trials ?? xml.Trial ?? xml.trial ?? xml;
  const trialList = normalizeTrialArray(trialsNode, ["Trial", "trial"]);

  return trialList
    .map((node) => {
      const id = pick(node, ["ctriNumber", "TrialNumber", "trialno"]);
      return {
        id,
        title: pick(node, ["PublicTitle", "ScientificTitle", "title"]),
        url: id ? `https://ctri.nic.in/Clinicaltrials/pview2.php?trialid=${encodeURIComponent(id)}` : undefined,
        phase: pick(node, ["Phase"]),
        status: pick(node, ["RecruitmentStatus"]),
        country: "India",
        source: "CTRI" as const,
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
