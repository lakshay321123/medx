export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { computeReadiness } from "@/lib/readiness";

const noStore = { "Cache-Control": "no-store, max-age=0" };
export async function GET() {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const sb = supabaseAdmin();
  const [p, o] = await Promise.all([
    sb.from('profiles').select('conditions_predisposition').eq('id', userId).maybeSingle(),
    sb.from('observations').select('kind,name,observed_at,meta').eq('user_id', userId),
  ]);
  const readiness = computeReadiness(p.data || {}, o.data || []);
  return NextResponse.json(readiness, { headers: noStore });
}
