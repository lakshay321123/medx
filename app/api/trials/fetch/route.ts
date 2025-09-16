import { NextRequest, NextResponse } from "next/server";
import type { TrialFacts, TrialIntervention, TrialOutcome } from "@/types/trialSummaries";

export const runtime = "nodejs";

const ID_REGEX = /\bNCT\d{8}\b/gi;
const TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 100;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

interface CacheEntry {
  data: TrialFacts;
  expiresAt: number;
  touchedAt: number;
}

const globalScope = globalThis as unknown as { __trialFetchCache?: Map<string, CacheEntry> };
const memCache: Map<string, CacheEntry> = globalScope.__trialFetchCache || new Map();
if (!globalScope.__trialFetchCache) {
  globalScope.__trialFetchCache = memCache;
}

class RateLimitError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

function normalizeId(raw: string) {
  const match = raw.toUpperCase().match(/NCT\d{8}/);
  return match ? match[0] : null;
}

function fromCache(nctId: string): TrialFacts | null {
  const entry = memCache.get(nctId);
  if (!entry) return null;
  const now = Date.now();
  if (entry.expiresAt < now) {
    memCache.delete(nctId);
    return null;
  }
  entry.touchedAt = now;
  return entry.data;
}

function pruneCache() {
  if (memCache.size <= MAX_CACHE) return;
  const entries = Array.from(memCache.entries());
  entries.sort((a, b) => a[1].touchedAt - b[1].touchedAt);
  while (memCache.size > MAX_CACHE && entries.length) {
    const [id] = entries.shift()!;
    memCache.delete(id);
  }
}

function toCache(nctId: string, data: TrialFacts) {
  memCache.set(nctId, { data, expiresAt: Date.now() + TTL_MS, touchedAt: Date.now() });
  pruneCache();
}

function safeString(value?: any) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

function formatAgeRange(minAge?: string | null, maxAge?: string | null) {
  const min = safeString(minAge);
  const max = safeString(maxAge);
  if (min && max) return `${min} to ${max}`;
  if (min) return `${min} and older`;
  if (max) return `${max} and younger`;
  return null;
}

function formatDateStruct(struct?: { StartDate?: string; PrimaryCompletionDate?: string; CompletionDate?: string }) {
  if (!struct) return null;
  const keys = ["StartDate", "PrimaryCompletionDate", "CompletionDate"] as const;
  for (const key of keys) {
    const value = (struct as any)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseEligibility(raw?: string | null) {
  const keyInclusion: string[] = [];
  const keyExclusion: string[] = [];
  if (!raw) return { keyInclusion, keyExclusion };
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let section: "none" | "inclusion" | "exclusion" = "none";
  for (const line of lines) {
    if (/^inclusion criteria[:]?$/i.test(line)) {
      section = "inclusion";
      continue;
    }
    if (/^exclusion criteria[:]?$/i.test(line)) {
      section = "exclusion";
      continue;
    }
    const normalized = line
      .replace(/^[\-•*\u2022\u2023\u25E6\u2043\u2219\s]+/, "")
      .replace(/^\d+[\).\s]+/, "")
      .trim();
    if (!normalized) continue;
    if (section === "inclusion") keyInclusion.push(normalized);
    else if (section === "exclusion") keyExclusion.push(normalized);
  }
  if (!keyInclusion.length && !keyExclusion.length) {
    const bullets = lines
      .map((line) =>
        line
          .replace(/^[\-•*\u2022\u2023\u25E6\u2043\u2219\s]+/, "")
          .replace(/^\d+[\).\s]+/, "")
          .trim()
      )
      .filter(Boolean)
      .slice(0, 6);
    keyInclusion.push(...bullets);
  }
  return {
    keyInclusion: keyInclusion.slice(0, 6),
    keyExclusion: keyExclusion.slice(0, 6),
  };
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function mapTrial(study: any, nctId: string): TrialFacts {
  const protocol = study?.ProtocolSection ?? {};
  const identification = protocol.IdentificationModule ?? {};
  const status = protocol.StatusModule ?? {};
  const design = protocol.DesignModule ?? {};
  const outcomes = protocol.OutcomesModule ?? {};
  const eligibilityModule = protocol.EligibilityModule ?? {};
  const arms = protocol.ArmsInterventionsModule ?? {};
  const contacts = protocol.ContactsLocationsModule ?? {};
  const sponsors = protocol.SponsorCollaboratorsModule ?? {};
  const conditionsModule = protocol.ConditionsModule ?? {};

  const interventionList: TrialIntervention[] = Array.isArray(arms?.InterventionList?.Intervention)
    ? arms.InterventionList.Intervention.map((item: any) => ({
        type: safeString(item?.InterventionType),
        name: safeString(item?.InterventionName),
      }))
    : [];

  const primaryOutcomes: TrialOutcome[] = Array.isArray(outcomes?.PrimaryOutcomeList?.PrimaryOutcome)
    ? outcomes.PrimaryOutcomeList.PrimaryOutcome.map((item: any) => ({
        title: safeString(item?.PrimaryOutcomeMeasure) || "",
        timeFrame: safeString(item?.PrimaryOutcomeTimeFrame),
      }))
        .filter((item: TrialOutcome) => Boolean(item.title))
    : [];

  const countries = Array.isArray(contacts?.LocationList?.Location)
    ? uniqueStrings(
        contacts.LocationList.Location.map((loc: any) => safeString(loc?.LocationCountry)).filter(Boolean) as string[]
      ).slice(0, 12)
    : [];

  const enrollmentCount = Number(design?.EnrollmentInfo?.EnrollmentCount);

  return {
    nctId,
    title: safeString(identification?.OfficialTitle) || safeString(identification?.BriefTitle) || null,
    status: safeString(status?.OverallStatus),
    phase: Array.isArray(design?.PhaseList?.Phase)
      ? uniqueStrings(design.PhaseList.Phase.map((p: any) => (typeof p === "string" ? p : null))).join(", ") || null
      : safeString(design?.Phase) || null,
    studyType: safeString(design?.StudyType),
    conditions: Array.isArray(conditionsModule?.ConditionList?.Condition)
      ? uniqueStrings(
          conditionsModule.ConditionList.Condition.map((condition: any) =>
            typeof condition === "string" ? condition : null
          )
        )
      : [],
    design: {
      masking: safeString(design?.MaskingInfo?.Masking),
      allocation: safeString(design?.Allocation),
      model: safeString(design?.InterventionModel) || safeString(design?.ObservationalModel),
      arms:
        typeof design?.NumberOfArms === "number"
          ? design.NumberOfArms
          : Array.isArray(arms?.ArmList?.Arm)
          ? arms.ArmList.Arm.length
          : null,
    },
    population: {
      age: formatAgeRange(eligibilityModule?.MinimumAge, eligibilityModule?.MaximumAge),
      sex: safeString(eligibilityModule?.Gender),
      targetEnrollment: Number.isFinite(enrollmentCount) ? enrollmentCount : null,
      countries,
    },
    interventions: interventionList,
    outcomes: {
      primary: primaryOutcomes,
    },
    eligibility: parseEligibility(eligibilityModule?.EligibilityCriteria),
    contacts: {
      sponsor: safeString(sponsors?.LeadSponsor?.LeadSponsorName),
      locationsCount: Array.isArray(contacts?.LocationList?.Location)
        ? contacts.LocationList.Location.length
        : null,
    },
    dates: {
      start:
        safeString(status?.StartDateStruct?.StartDate) ||
        safeString((status?.StartDateStruct as any)?.StartDate) ||
        formatDateStruct(status?.StartDateStruct) ||
        safeString((status as any)?.StartDate),
      primaryCompletion:
        safeString(status?.PrimaryCompletionDateStruct?.PrimaryCompletionDate) ||
        formatDateStruct(status?.PrimaryCompletionDateStruct),
      completion:
        safeString(status?.CompletionDateStruct?.CompletionDate) ||
        formatDateStruct(status?.CompletionDateStruct),
    },
    sources: [
      {
        label: "ClinicalTrials.gov",
        url: `https://clinicaltrials.gov/study/${nctId}`,
      },
    ],
  };
}

async function fetchTrial(nctId: string): Promise<TrialFacts | null> {
  const cached = fromCache(nctId);
  if (cached) return cached;
  const url = `https://clinicaltrials.gov/api/query/full_studies?expr=${encodeURIComponent(
    nctId
  )}&min_rnk=1&max_rnk=1&fmt=json`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "user-agent": USER_AGENT,
        },
        signal: controller.signal,
      });
      if (res.status === 404) return null;
      if (res.status === 429) throw new RateLimitError("clinicaltrials.gov rate limited");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const study = json?.FullStudiesResponse?.FullStudies?.[0]?.Study;
      if (!study) return null;
      const mapped = mapTrial(study, nctId);
      toCache(nctId, mapped);
      return mapped;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof RateLimitError) throw err;
      if (err?.name === "AbortError") {
        if (attempt === 2) throw new Error("clinicaltrials.gov timeout");
      } else if (attempt === 2) {
        throw lastError;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  if (lastError) throw lastError;
  return null;
}

function extractIds(param: string | null) {
  if (!param) return [];
  const set = new Set<string>();
  const matches = param.match(ID_REGEX);
  if (!matches) return [];
  for (const m of matches) {
    const normalized = normalizeId(m);
    if (normalized) set.add(normalized);
    if (set.size >= 5) break;
  }
  return Array.from(set);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  const ids = extractIds(idsParam);
  if (!ids.length) {
    return NextResponse.json({ trials: [], error: "No valid NCT IDs provided" }, { status: 400 });
  }

  const trials: TrialFacts[] = [];
  try {
    for (const id of ids) {
      try {
        const data = await fetchTrial(id);
        if (data) {
          trials.push(data);
        } else {
          trials.push({
            nctId: id,
            conditions: [],
            design: {},
            population: { countries: [] },
            interventions: [],
            outcomes: { primary: [] },
            eligibility: { keyInclusion: [], keyExclusion: [] },
            contacts: {},
            dates: {},
            sources: [
              {
                label: "ClinicalTrials.gov",
                url: `https://clinicaltrials.gov/study/${id}`,
              },
            ],
            error: "Not found on ClinicalTrials.gov",
          });
        }
      } catch (err: any) {
        if (err instanceof RateLimitError) {
          return NextResponse.json(
            {
              trials,
              error: "Please try again in a minute—source rate limited.",
            },
            { status: 429 }
          );
        }
        throw err;
      }
    }
    return NextResponse.json(
      { trials },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=3600",
        },
      }
    );
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "Failed to fetch trials";
    return NextResponse.json({ trials, error: message }, { status: 502 });
  }
}
