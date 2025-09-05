export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { orchestrate } from "@/lib/aidoc/orchestrator";

const DEFAULT_THREAD = 'med-profile';

export async function POST(req: NextRequest) {
  const { text, threadId } = await req.json().catch(() => ({}));
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const sb = supabaseAdmin();
  const thread = String(threadId || DEFAULT_THREAD);

  const [{ data: prof }, sumRes, obsRes] = await Promise.all([
    sb.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    fetch(new URL('/api/profile/summary', req.url)).then(r=>r.json()).catch(()=>({})),
    sb.from('observations').select('*').eq('user_id', userId)
  ]);

  const name = (prof?.full_name || 'there').toString().trim();
  const summaryText = sumRes?.summary?.text || sumRes?.summary || sumRes?.text || '';
  const observations = (obsRes.data || []) as any[];
  const now = Date.now();
  const lastSymptom = observations
    .filter(o => (o.kind || '').toLowerCase() === 'symptom')
    .filter(o => now - new Date(o.observed_at || o.created_at).getTime() < 30*24*60*60*1000)
    .sort((a,b)=> new Date(b.observed_at || b.created_at).getTime() - new Date(a.observed_at || a.created_at).getTime())[0];

  const result = await orchestrate({ sb, userId, threadId: thread, text: String(text || ''), name, summaryText, lastSymptom });
  return NextResponse.json(result);
}
