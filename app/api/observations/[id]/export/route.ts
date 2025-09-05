export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const id = params.id;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("observations")
    .select("name, meta")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  const meta = data.meta || {};
  const fields = meta.patient_fields
    ? Object.entries(meta.patient_fields)
        .map(([k, v]) => (v ? `<p><b>${k}:</b> ${v}</p>` : ""))
        .join("")
    : "";
  const html = `<!DOCTYPE html><html><body><h1>${data.name || meta.label || 'Observation'}</h1>${meta.summary ? `<p>${meta.summary}</p>` : ''}${fields}</body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "application/msword",
      "Content-Disposition": `attachment; filename=observation-${id}.doc`,
    },
  });
}
