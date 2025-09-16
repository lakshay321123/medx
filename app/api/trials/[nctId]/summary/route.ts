// app/api/trials/[nctId]/summary/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { RESEARCH_TRIAL_BRIEF_STYLE } from "@/lib/styles";
import { createLLM } from "@/lib/llm";
import type { ChatMsg } from "@/lib/llm";

// -------------------- helpers --------------------
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

function normNct(raw: string) {
  const m = (raw || "").toUpperCase().match(/NCT\d{8}/);
  return m ? m[0] : "";
}

async function fetchMaybe(url: string, timeoutMs = 8000): Promise<{ json: any } | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      cache: "no-store",
      signal: ac.signal,
      // Some CT.gov edges 404/403 on unknown UA; use a common browser UA
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        accept: "application/json",
      },
    });
    if (r.status === 404) return null; // treat as "no results", not a hard failure
    if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
    return { json: await r.json() };
  } finally {
    clearTimeout(t);
  }
}

async function fetchFullStudy(nctId: string) {
  const url = `https://clinicaltrials.gov/api/query/full_studies?expr=${encodeURIComponent(
    nctId
  )}&min_rnk=1&max_rnk=1&fmt=JSON`;
  const res = await fetchMaybe(url);
  if (!res) return null;
  const study = res.json?.FullStudiesResponse?.FullStudies?.[0]?.Study;
  return study ? { kind: "full", study, pageUrl: `https://clinicaltrials.gov/study/${nctId}` } : null;
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
  const res = await fetchMaybe(url);
  if (!res) return null;
  const row = res.json?.StudyFieldsResponse?.StudyFields?.[0];
  return row ? { kind: "fields", row, pageUrl: `https://clinicaltrials.gov/study/${nctId}` } : null;
}

async function fetchV2(nctId: string) {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(nctId)}&pageSize=1`;
  const res = await fetchMaybe(url);
  if (!res) return null;
  const item = res.json?.studies?.[0];
  return item ? { kind: "v2", item, pageUrl: `https://clinicaltrials.gov/study/${nctId}` } : null;
}

function coalesceFromFull(study: any) {
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

function coalesceFromFields(row: any) {
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

function coalesceFromV2(item: any) {
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
    .slice(0, 3);

  return {
    tldr: [info.title, bullets[0]].filter(Boolean).join(" — "),
    bullets,
    details: {
      design: info.design || "",
      population: info.enrollment ? `Enrollment: ${info.enrollment}` : "",
      interventions: info.interventions || "",
      primary_outcomes: info.primaryOutcomes || "",
      key_eligibility: info.eligibility || "",
    },
    citations: [{ title: "ClinicalTrials.gov record", url: pageUrl }],
  };
}

async function maybeLLM(base: Brief, info: any, pageUrl: string): Promise<Brief> {
  try {
    const llm = createLLM();
    const messages: ChatMsg[] = [
      { role: "system", content: `${RESEARCH_TRIAL_BRIEF_STYLE}\n\nSOURCES:\n[1] ${pageUrl}` },
      { role: "user", content: JSON.stringify(info) },
    ];
    const resp: any = await llm.chat({
      messages,
      temperature: 0.2,
      max_tokens: 260,
      response_format: { type: "json_object" } as any,
    });
    const text = typeof resp === "string" ? resp : resp?.content ?? "";
    const j = JSON.parse(text);
    return {
      tldr: j.tldr || base.tldr,
      bullets: Array.isArray(j.bullets) && j.bullets.length ? j.bullets : base.bullets,
      details: { ...base.details, ...(j.details || {}) },
      citations: j.citations?.length ? j.citations : base.citations,
    };
  } catch {
    return base; // still return a minimal brief
  }
}

// -------------------- route --------------------
export async function GET(_req: NextRequest, ctx: { params: { nctId: string } }) {
  const nctId = normNct(ctx.params?.nctId);
  if (!nctId) return NextResponse.json({ error: "Invalid NCT id" }, { status: 400 });

  try {
    // Try v1 full_studies
    const full = await fetchFullStudy(nctId);
    if (full) {
      const info = coalesceFromFull(full.study);
      const base = minimalBrief(nctId, info, full.pageUrl);
      return NextResponse.json(await maybeLLM(base, info, full.pageUrl));
    }

    // Fallback: v1 study_fields
    const fields = await fetchStudyFields(nctId);
    if (fields) {
      const info = coalesceFromFields(fields.row);
      const base = minimalBrief(nctId, info, fields.pageUrl);
      return NextResponse.json(await maybeLLM(base, info, fields.pageUrl));
    }

    // Fallback: v2 studies
    const v2 = await fetchV2(nctId);
    if (v2) {
      const info = coalesceFromV2(v2.item);
      const base = minimalBrief(nctId, info, v2.pageUrl);
      return NextResponse.json(await maybeLLM(base, info, v2.pageUrl));
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Fetch error" }, { status: 502 });
  }
}
