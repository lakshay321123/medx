import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase.from('your_table').select('id').limit(1);
  return NextResponse.json({ ok: !error, count: data?.length ?? 0 });
}
