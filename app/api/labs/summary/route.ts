import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUserId } from '@/lib/getUserId';

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('observation_labs')
    .select('test_code,test_name,value,unit,sample_date')
    .eq('user_id', userId)
    .order('sample_date', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const by: Record<string, any[]> = {};
  for (const row of data ?? []) {
    (by[row.test_code] ||= []).push(row);
  }

  const trend = Object.entries(by).map(([code, rows]) => {
    const latest = rows[0] || null;
    const previous = rows[1] || null;
    const betterIfLower = ['HBA1C', 'LDL-C', 'CRP', 'TG', 'TC'].includes(code);
    const betterIfHigher = ['HDL-C', 'VITD'].includes(code);
    let direction: 'improving' | 'worsening' | 'flat' | 'unknown' = 'unknown';
    if (latest && previous) {
      const delta = Number(latest.value) - Number(previous.value);
      if (Number.isFinite(delta)) {
        if (Math.abs(delta) < 1e-9) direction = 'flat';
        else if (betterIfLower) direction = delta < 0 ? 'improving' : 'worsening';
        else if (betterIfHigher) direction = delta > 0 ? 'improving' : 'worsening';
        else direction = delta === 0 ? 'flat' : 'unknown';
      }
    }

    return {
      test_code: code,
      test_name: latest?.test_name,
      unit: latest?.unit,
      latest,
      previous,
      direction,
      series: rows,
    };
  });

  return NextResponse.json({ ok: true, trend });
}
