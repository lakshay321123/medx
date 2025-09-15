export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { RESEARCH_TRIAL_BRIEF_STYLE } from '@/lib/styles';
import { createLLM } from '@/lib/llm';

async function fetchCtgov(nctId: string) {
  const url = `https://clinicaltrials.gov/api/query/full_studies?expr=${encodeURIComponent(nctId)}&min_rnk=1&max_rnk=1&fmt=JSON`;
  const r = await fetch(url, { cache: 'no-store' });
  const j = r.ok ? await r.json() : null;
  const study = j?.FullStudiesResponse?.FullStudies?.[0]?.Study || null;
  return { pageUrl: `https://clinicaltrials.gov/study/${nctId}`, study };
}

export async function GET(req: NextRequest, { params }: { params: { nctId: string } }) {
  const nctId = (params.nctId || '').toUpperCase();
  if (!/^NCT\d{8}$/.test(nctId)) return NextResponse.json({ error: 'Invalid NCT' }, { status: 400 });

  const { pageUrl, study } = await fetchCtgov(nctId);
  if (!study) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const S = study?.ProtocolSection || {};
  const title = S?.IdentificationModule?.OfficialTitle || S?.IdentificationModule?.BriefTitle || '';
  const phase = (S?.DesignModule?.PhaseList?.Phase || []).join(', ');
  const status = S?.StatusModule?.OverallStatus || '';
  const enrollment = S?.DesignModule?.EnrollmentInfo?.EnrollmentCount || '';
  const primaryCompletion = S?.StatusModule?.PrimaryCompletionDateStruct?.PrimaryCompletionDate || '';
  const conditions = (S?.ConditionsModule?.ConditionList?.Condition || []).join('; ');
  const interventions = (S?.ArmsInterventionsModule?.InterventionList?.Intervention || [])
    .map((x:any)=>`${x.InterventionType}: ${x.InterventionName}`).join('; ');
  const primaryOutcomes = (S?.OutcomesModule?.PrimaryOutcomeList?.PrimaryOutcome || [])
    .map((o:any)=>`${o.PrimaryOutcomeMeasure}${o.PrimaryOutcomeTimeFrame?` (${o.PrimaryOutcomeTimeFrame})`:''}`).join('; ');

  const ctx = `NCT: ${nctId}
Title: ${title}
Phase: ${phase}
Status: ${status}
Enrollment: ${enrollment}
Primary completion: ${primaryCompletion}
Conditions: ${conditions}
Interventions: ${interventions}
Primary outcomes: ${primaryOutcomes}`;

  const sources = [{ title: 'ClinicalTrials.gov record', url: pageUrl }];
  const messages = [
    { role: 'system', content: RESEARCH_TRIAL_BRIEF_STYLE + `\n\nSOURCES:\n[1] ClinicalTrials.gov\n${pageUrl}` },
    { role: 'user', content: ctx }
  ];

  const llm = createLLM();
  const resp = await llm.chat({
    messages,
    temperature: 0.2,
    max_tokens: 260,
    response_format: { type: 'json_object' } as any
  });

  const text = typeof resp === 'string' ? resp : (resp as any).content ?? '';
  return new Response(text, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

