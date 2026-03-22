import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId, medicationId, quantity, filledAt, daysSupply, pharmacy } = body;
  if (!userId || !medicationId || !quantity || !filledAt || !daysSupply) {
    return NextResponse.json({ error: "userId, medicationId, quantity, filledAt, daysSupply required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("med_refills")
    .insert({
      user_id: userId,
      medication_id: medicationId,
      quantity,
      filled_at: filledAt,
      days_supply: daysSupply,
      pharmacy: pharmacy ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, refill: data });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("med_refills")
    .select("*, medications(name, dose)")
    .eq("user_id", userId)
    .order("refill_due", { ascending: true });

  // Flag upcoming refills (due within 7 days)
  const now = new Date();
  const enriched = (data ?? []).map((r) => ({
    ...r,
    daysUntilDue: r.refill_due ? Math.ceil((new Date(r.refill_due).getTime() - now.getTime()) / 86400000) : null,
    urgent: r.refill_due ? new Date(r.refill_due).getTime() - now.getTime() < 7 * 86400000 : false,
  }));

  return NextResponse.json(enriched);
}
