export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deriveInputs } from '@/lib/predict/derive';
import { scoreRisk } from '@/lib/predict/score';

const TEST_USER = process.env.MEDX_TEST_USER_ID!;

export async function POST(req: NextRequest) {
  try {
    const { threadId } = await req.json().catch(() => ({} as any));
    if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 });

    // 1) derive inputs from latest observations
    const inputs = await deriveInputs(TEST_USER, threadId);

    // 2) score
    const result = scoreRisk(inputs);

    // 3) save prediction
    const sb = supabaseAdmin();
    const { data: pred, error: perr } = await sb.from('predictions').insert({
      user_id: TEST_USER,
      thread_id: threadId,
      model: 'medx-heuristic-v1',
      risk_score: result.riskScore,
      band: result.band,
      factors: result.factors,
      recommendations: result.recommendations,
      inputs_snapshot: inputs,
    }).select().single();
    if (perr) throw new Error(perr.message);

    // 4) alert on thresholds
    if (result.band === 'Red' || (result.band === 'Yellow' && result.riskScore >= 50)) {
      await sb.from('alerts').insert({
        user_id: TEST_USER,
        thread_id: threadId,
        severity: result.band === 'Red' ? 'high' : 'medium',
        title: result.band === 'Red' ? 'High Risk Alert' : 'Moderate Risk Alert',
        body: `Latest risk score ${result.riskScore} (${result.band}). Review timeline.`,
        meta: { factors: result.factors }
      });
    }

    return NextResponse.json({ ok: true, prediction: pred, inputs, result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'compute failed' }, { status: 500 });
  }
}
