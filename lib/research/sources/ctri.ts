import { normalizePhase } from "./utils";
import type { TrialRecord } from "@/types/research";
import { fetchCTRI } from "@/lib/trials/fetchCTRI";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: "ctri";
  date?: string;
  extra?: {
    status?: string;
    recruiting?: boolean;
    /** Raw phase string as reported by CTRI (e.g., "Phase 3") */
    phase?: string;
    /** Normalized evidence level derived from the phase */
    evidenceLevel?: string;
  };
};

const ORIGIN = "https://ctri.nic.in";
const SEARCH = ORIGIN + "/Clinicaltrials/advsearch.php";

// lightweight fetch with timeout + UA; keep separate from fetchJson(JSON-only)
async function fetchHtml(url: string, timeoutMs = 12000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "MedX/1.0 (+research; contact: support@medx.example)" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

// very small HTML helper
function text(v?: string) {
  return (v || "").replace(/\s+/g, " ").trim();
}

export async function searchCtri(query: string, opts?: { max?: number }): Promise<Citation[]> {
  // CTRI’s advanced search params vary; this query hits title/condition broadly.
  const url = `${SEARCH}?term=${encodeURIComponent(query)}`;
  let html: string;
  try {
    html = await fetchHtml(url);
  } catch {
    return [];
  }

  // Parse rows. CTRI typically renders results with anchors to view.php?trialid=
  // We’ll capture blocks containing trial link + visible title/status.
  const out: Citation[] = [];
  const reRow = /<a[^>]*href="([^\"]*view\.php\?trialid=\d+[^\"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<td[^>]*>\s*Status\s*:<\/td>\s*<td[^>]*>(.*?)<\/td>|<a[^>]*href="([^\"]*view\.php\?trialid=\d+[^\"]*)"[^>]*>(.*?)<\/a>/gi;

  let m: RegExpExecArray | null;
  while ((m = reRow.exec(html)) && out.length < (opts?.max ?? 30)) {
    // Two patterns: with inline status capture or without.
    const href = text(m[1] || m[4] || "");
    const title = text(stripTags(m[2] || m[5] || ""));
    const status = text(stripTags(m[3] || ""));

    if (!href || !title) continue;

    // Extract CTRI id if present in detail page (we’ll leave as title-derived if absent)
    const detailUrl = href.startsWith("http") ? href : ORIGIN + "/Clinicaltrials/" + href.replace(/^\/+/, "");
    const idMatch =
      title.match(/\bCTRI\/[0-9]{4}\/[0-9]{2}\/[0-9]{6}\b/i) ||
      detailUrl.match(/\bCTRI\/[0-9]{4}\/[0-9]{2}\/[0-9]{6}\b/i);

    let phase = "";
    try {
      const detailHtml = await fetchHtml(detailUrl);
      const pm = /Phase of Trial[^<]*<\/td>\s*<td[^>]*>(.*?)<\/td>/i.exec(detailHtml);
      phase = text(stripTags(pm?.[1] || ""));
    } catch {}
    const evidenceLevel = normalizePhase(phase);

    out.push({
      id: idMatch ? idMatch[0] : detailUrl,
      title,
      url: detailUrl,
      source: "ctri",
      // CTRI pages sometimes show “Date of Registration: dd-mm-yyyy”
      // We won’t over-parse dates here; orchestrator will still work without.
      extra: {
        status: status || undefined,
        recruiting: /recruiting/i.test(status),
        phase: phase || undefined,
        evidenceLevel,
      },
    });
  }

  return out;
}

function stripTags(s: string) {
  return s.replace(/<[^>]*>/g, "");
}

// ---- TrialRecord fetcher -------------------------------------------------

export async function searchCTRI(q: string): Promise<TrialRecord[]> {
  const raw = await fetchCTRI(q).catch(() => []);
  return raw.map((r: any): TrialRecord => ({
    registry: "CTRI",
    registry_id: r.id,
    title: r.title,
    condition: undefined,
    phase: r.phase,
    status: r.status,
    locations: r.country ? [r.country] : [],
    url: r.url || "",
    when: undefined,
  }));
}


