import type { ResearchFilters } from "@/types/research-core";
import { normalizePhase, normalizeStatus } from "@/types/research-core";

export function toTrialsQuery(tq: any, f: ResearchFilters) {
  return {
    condition: tq.condition || tq.cancerType,
    keywords: tq.keywords,
    phase: f.phase,
    status: f.status,
    country: f.country,
    gene: f.gene,
  };
}

export function normalizeTrial(raw: any) {
  return {
    id: String(raw.id ?? raw.nctId ?? raw.slug ?? cryptoRandomId()),
    title: raw.title ?? raw.name ?? "Untitled trial",
    phase: normalizePhase(raw.phase),
    status: normalizeStatus(raw.status),
    country: raw.country || undefined,
    gene: raw.gene || undefined,
    url: raw.url ?? raw.nctUrl ?? "#",
  };
}

// tiny fallback id for mocks
function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}
