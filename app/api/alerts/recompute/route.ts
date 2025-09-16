export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { listPatientIds } from "@/lib/patients";

export async function POST() {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const supa = supabaseAdmin();
  const patientIds = await listPatientIds(supa, userId).catch(() => [] as string[]);
  const [p,o] = await Promise.all([
    patientIds.length
      ? supa.from("predictions").select("id",{count:"exact", head:true}).in("patient_id",patientIds)
      : Promise.resolve({ count: 0, error: null } as any),
    supa.from("observations").select("id",{count:"exact", head:true}).eq("user_id",userId),
  ]);
  if (p.error) return NextResponse.json({ error:p.error.message }, { status:500 });
  if (o.error) return NextResponse.json({ error:o.error.message }, { status:500 });
  return NextResponse.json({ ok:true, inspected:{predictions:p.count||0, observations:o.count||0} }, { headers: { "Cache-Control":"no-store" }});
}
