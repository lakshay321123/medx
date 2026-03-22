import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId, medicationId, reminderId, scheduledAt, status, takenAt, notes, sideEffects } = body;
  if (!userId || !medicationId || !scheduledAt || !status) {
    return NextResponse.json({ error: "userId, medicationId, scheduledAt, status required" }, { status: 400 });
  }
  if (!["taken", "skipped", "missed", "late"].includes(status)) {
    return NextResponse.json({ error: "status must be taken|skipped|missed|late" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("med_adherence_log")
    .insert({
      user_id: userId,
      medication_id: medicationId,
      reminder_id: reminderId ?? null,
      scheduled_at: scheduledAt,
      status,
      taken_at: status === "taken" || status === "late" ? (takenAt ?? new Date().toISOString()) : null,
      notes: notes ?? null,
      side_effects: sideEffects ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, log: data });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const days = Number(url.searchParams.get("days") || "7");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: logs } = await db
    .from("med_adherence_log")
    .select("*, medications(name, dose)")
    .eq("user_id", userId)
    .gte("scheduled_at", since)
    .order("scheduled_at", { ascending: false });

  // Compute adherence stats
  const total = logs?.length ?? 0;
  const taken = logs?.filter((l) => l.status === "taken" || l.status === "late").length ?? 0;
  const skipped = logs?.filter((l) => l.status === "skipped").length ?? 0;
  const missed = logs?.filter((l) => l.status === "missed").length ?? 0;
  const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 100;

  return NextResponse.json({
    logs: logs ?? [],
    stats: { total, taken, skipped, missed, adherencePct, days },
  });
}
