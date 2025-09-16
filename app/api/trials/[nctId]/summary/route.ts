// app/api/trials/[nctId]/summary/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { RESEARCH_TRIAL_BRIEF_STYLE } from "@/lib/styles";
import { createLLM } from "@/lib/llm";
import type { ChatMsg } from "@/lib/llm";

/* ---------- utils ---------- */
type Brief = {
  tldr?: string;
  bullets?: string[];
  details?: {
    design?: string;
    population?: string;
    interventions?: string;
    primary_outcomes?: string;
    key_eligibility?: string;
  };
  citations?: { title: string; url: string }[];
};

const WORDS = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const clampWords = (s: string, n: number) => {
  const parts = s.trim().split(/\s+/);
  return parts.length > n ? parts.slice(0, n).join(" ") : s.trim();
};
const clean = (s?: string) =>
  String(s || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/^\s*[-•–]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

function sanitizeBrief(b: any): Brief {
  let tldr = clean(b?.tldr)
    .replace(/^tl;?dr[:\s-]+/i, "")
    .replace(/[—–-]\s.*$/g, ""); // drop after first dash run
  tldr = clampWords(tldr, 18);

  const bullets = (Array.isArray(b?.bullets) ? b.bullets : [])
    .map((x) => clean(String(x)).replace(/[.]+$/g, ""))
    .filter(Boolean)
    .map((x) => clampWords(x, 12))
    .slice(0, 3);

  const details = b?.details || {};
  const norm = (k: string) => clean(details[k]);

  return {
    tldr,
    bullets,
    details: {
      design: norm("design"),
      population: norm("population"),
      interventions: norm("interventions"),
      primary_outcomes: norm("primary_outcomes"),
      key_eligibility: norm("key_eligibility"),
    },
    citations: Array.isArray(b?.citations) && b.citations.length ? b.citations : [],
  };
}

function normNct(raw: string) {
  const m = (raw || "").toUpperCase().match(/NCT\d{8}/);
  return m ? m[0] : "";
}

async function fetchMaybe(url: string, timeoutMs = 8000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      cache: "no-store",
      signal: ac.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        accept: "application/json",
      },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/* ---------- CT.gov fetchers with fallbacks ---------- */
async function fetchFullStudy(nctId: string) {
  const url = `https://clinicaltrials.gov/api/query/full_studies?expr=${encodeURIComponent(
    nctId
  )}&min_rnk=1&max_rnk=1&fmt=JSON`;
  const j = await fetchMaybe(url);
  const study = j?.FullStudiesResponse?.FullStudies?.[0]?.Study;
  return study ? { study, pageUrl: `https://clinicaltrials.gov/study/${nctId}` } : null;
}
async function fetchStudyFields(nctId: string) {
  const fields = [
    "NCTId",
    "BriefTitle",
    "OverallStatus",
    "Condition",
    "Phase",
    "EnrollmentCount",
    "InterventionType",
    "InterventionName",
    "PrimaryOutcomeMeasure",
    "PrimaryOutcomeTimeFrame",
    "EligibilityCriteria",
    "StudyType",
  ];
  const url = `https://clinicaltrials.gov/api/query/study_fields?expr=${encodeURIComponent(
    nctId
  )}&fields=${fields.join(",")}&min_rnk=1&max_rnk=1&fmt=JSON`;
  const j = await fetchMaybe(url);
  const row = j?.StudyFieldsResponse?.StudyFields?.[0];
  return row ? { row, pageUrl: `https://clinicaltrials.gov/study/${nctId}` } : null;
}
async function fetchV2(nctId: string) {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(nctId)}&pageSize=1`;
  const j = await fetchMaybe(url);
  const item = j?.studies?.[0];
  return item ? { item, pageUrl: `https://clinicaltrials.gov/study/${nctId}` } : null;
}

/* ---------- coalesce ---------- */
function fromFull(study: any) {
  const S = study?.ProtocolSection ?? {};
  return {
    title: S?.IdentificationModule?.OfficialTitle || S?.IdentificationModule?.BriefTitle || "",
    phase: (S?.DesignModule?.PhaseList?.Phase || []).join(", "),
    status: S?.StatusModule?.OverallStatus || "",
    enrollment: S?.DesignModule?.EnrollmentInfo?.EnrollmentCount || "",
    conditions: (S?.ConditionsModule?.ConditionList?.Condition || []).join("; "),
    interventions: (S?.ArmsInterventionsModule?.InterventionList?.Intervention || [])
      .map((x: any) => `${x.InterventionType}: ${x.InterventionName}`)
      .join("; "),
    primaryOutcomes: (S?.OutcomesModule?.PrimaryOutcomeList?.PrimaryOutcome || [])
      .map(
        (o: any) => `${o.PrimaryOutcomeMeasure}${o.PrimaryOutcomeTimeFrame ? ` (${o.PrimaryOutcomeTimeFrame})` : ""}`
      )
      .join("; "),
    eligibility: S?.EligibilityModule?.EligibilityCriteria || "",
    design: [S?.DesignModule?.StudyType, S?.DesignModule?.Allocation, S?.DesignModule?.InterventionModel]
      .filter(Boolean)
      .join(", "),
  };
}
function fromFields(row: any) {
  const g = (k: string) => (Array.isArray(row?.[k]) ? row[k].join("; ") : row?.[k] || "");
  const interventions = (() => {
    const types = row?.InterventionType ?? [];
    const names = row?.InterventionName ?? [];
    const out: string[] = [];
    for (let i = 0; i < Math.max(types.length, names.length); i++) {
      if (types[i] || names[i]) out.push(`${types[i] || "Intervention"}: ${names[i] || ""}`.trim());
    }
    return out.join("; ");
  })();
  const outcomes = (() => {
    const m = row?.PrimaryOutcomeMeasure ?? [];
    const t = row?.PrimaryOutcomeTimeFrame ?? [];
    const out: string[] = [];
    for (let i = 0; i < Math.max(m.length, t.length); i++) {
      if (m[i]) out.push(`${m[i]}${t[i] ? ` (${t[i]})` : ""}`);
    }
    return out.join("; ");
  })();
  return {
    title: g("BriefTitle"),
    phase: g("Phase"),
    status: g("OverallStatus"),
    enrollment: g("EnrollmentCount"),
    conditions: g("Condition"),
    interventions,
    primaryOutcomes: outcomes,
    eligibility: g("EligibilityCriteria"),
    design: g("StudyType"),
  };
}
function fromV2(item: any) {
  const id = item?.protocolSection;
  const outcomes = (id?.outcomesModule?.primaryOutcomes || [])
    .map((o: any) => `${o.measure}${o.timeFrame ? ` (${o.timeFrame})` : ""}`)
    .join("; ");
  const intervent = (id?.armsInterventionsModule?.interventions || [])
    .map((x: any) => `${x.type}: ${x.name}`)
    .join("; ");
  return {
    title: id?.identificationModule?.officialTitle || id?.identificationModule?.briefTitle || "",
    phase: (id?.designModule?.phases || []).join(", "),
    status: id?.statusModule?.overallStatus || "",
    enrollment: id?.designModule?.enrollmentInfo?.count || "",
    conditions: (id?.conditionsModule?.conditions || []).join("; "),
    interventions: intervent,
    primaryOutcomes: outcomes,
    eligibility: id?.eligibilityModule?.eligibilityCriteria || "",
    design: [id?.designModule?.studyType, id?.designModule?.allocation, id?.designModule?.interventionModel]
      .filter(Boolean)
      .join(", "),
  };
}

function minimalBrief(nctId: string, info: any, pageUrl: string): Brief {
  const bullets = [
    info.phase && info.status ? `${info.phase} — ${info.status}` : info.phase || info.status || "",
    info.conditions ? `Conditions: ${info.conditions}` : "",
    info.interventions ? `Interventions: ${info.interventions}` : "",
  ]
    .filter(Boolean)
    .slice(0, 3)
    .map((s: string) => clampWords(s, 12));

  return sanitizeBrief({
    tldr: clampWords([info.title, bullets[0]].filter(Boolean).join(" — "), 18),
    bullets,
    details: {
      design: info.design || "",
      population: info.enrollment ? `Enrollment: ${info.enrollment}` : "",
      interventions: info.interventions || "",
      primary_outcomes: info.primaryOutcomes || "",
      key_eligibility: info.eligibility || "",
    },
    citations: [{ title: "ClinicalTrials.gov record", url: pageUrl }],
  });
}

/* ---------- LLM ---------- */
async function maybeLLM(base: Brief, info: any, pageUrl: string): Promise<Brief> {
  try {
    const llm = createLLM();
    const messages = [
      { role: "system", content: `${RESEARCH_TRIAL_BRIEF_STYLE}\n\nSOURCES:\n[1] ${pageUrl}` },
      { role: "user", content: JSON.stringify(info) },
    ] satisfies ChatMsg[];
    const resp: any = await llm.chat({
      messages,
      temperature: 0.2,
      max_tokens: 260,
      response_format: { type: "json_object" } as any,
    });

    const raw = typeof resp === "string" ? resp : resp?.content ?? "";
    let parsed: any = null;
    try {
      parsed = JSON.parse(clean(raw));
    } catch {
      parsed = null;
    }

    const merged = {
      tldr: parsed?.tldr || base.tldr,
      bullets: Array.isArray(parsed?.bullets) && parsed.bullets.length ? parsed.bullets : base.bullets,
      details: { ...base.details, ...(parsed?.details || {}) },
      citations: parsed?.citations?.length ? parsed.citations : base.citations,
    };
    return sanitizeBrief(merged);
  } catch {
    return sanitizeBrief(base);
  }
}

/* ---------- route ---------- */
export async function GET(_req: NextRequest, ctx: { params: { nctId: string } }) {
  const nctId = normNct(ctx.params?.nctId);
  if (!nctId) return NextResponse.json({ error: "Invalid NCT id" }, { status: 400 });

  try {
    const full = await fetchFullStudy(nctId);
    if (full) {
      const info = fromFull(full.study);
      const base = minimalBrief(nctId, info, full.pageUrl);
      return NextResponse.json(await maybeLLM(base, info, full.pageUrl));
    }

    const fields = await fetchStudyFields(nctId);
    if (fields) {
      const info = fromFields(fields.row);
      const base = minimalBrief(nctId, info, fields.pageUrl);
      return NextResponse.json(await maybeLLM(base, info, fields.pageUrl));
    }

    const v2 = await fetchV2(nctId);
    if (v2) {
      const info = fromV2(v2.item);
      const base = minimalBrief(nctId, info, v2.pageUrl);
      return NextResponse.json(await maybeLLM(base, info, v2.pageUrl));
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Fetch error" }, { status: 502 });
  }
}
