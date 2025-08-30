import { NextRequest, NextResponse } from 'next/server';
import { getTrials } from '@/lib/clinicaltrials';

export const runtime = 'edge';

export async function GET(req: NextRequest){
  const cond = req.nextUrl.searchParams.get('condition') || '';
  if(!cond) return NextResponse.json({ items: [] });
  try {
    const data = await getTrials(cond);
    const items = (data?.studies || []).map((s:any)=>({
      title: s.protocolSection?.identificationModule?.briefTitle || s.briefTitle || 'Untitled trial',
      eligibility: s.protocolSection?.eligibilityModule?.eligibilityCriteria || '',
      link: s.protocolSection?.identificationModule?.nctId ? `https://clinicaltrials.gov/ct2/show/${s.protocolSection.identificationModule.nctId}` : '',
      source: 'ClinicalTrials.gov'
    }));
    return NextResponse.json({ items });
  } catch(e:any){
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
