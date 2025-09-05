export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function POST() {
  const uid = await getUserId();
  if (!uid) return new NextResponse("Unauthorized", { status: 401 });
  const db = supabaseAdmin();
  const delObs = await db.from('observations').delete().eq('user_id', uid);
  const delPred = await db.from('predictions').delete().eq('user_id', uid);
  if (delObs.error || delPred.error) {
    return NextResponse.json({ ok: false, error: delObs.error?.message || delPred.error?.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
