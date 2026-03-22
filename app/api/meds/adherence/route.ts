import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_STATUSES = ["taken", "skipped", "missed", "late"] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId, medicationId, reminderId, scheduledAt, status, takenAt, notes, sideEffects } = body;
  if (!userId || !medicationId || !scheduledAt || !status) {
    return NextResponse.json({ error: "userId, medicationId, scheduledAt, status required" }, { status: 400 });
  }
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status must be taken|skipped|missed|late" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.from("med_adherence_log").insert({
    user_id: userId, medication_id: medicationId, reminder_id: reminderId ?? null,
    scheduled_at: scheduledAt, status,
    taken_at: status === "taken" || status === "late" ? (takenAt ?? new Date().toISOString()) : null,
    notes: notes ?? null, side_effects: sideEffects ?? null,
  }).select().single();

  if (error) { console.error("[adherence] save error:", error); return NextResponse.json({ error: "Could not save." }, { status: 500 }); }
  return NextResponse.json({ ok: true, log: data });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const daysRaw = Number(url.searchParams.get("days") || "7");
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 7;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const since = new Date(Date.now() - days * MS_PER_DAY).toISOString();
  const { data: logs } = await db.from("med_adherence_log").select("*, medications(name, dose)")
    .eq("user_id", userId).gte("scheduled_at", since).order("scheduled_at", { ascending: false });

  const stats = (logs ?? []).reduce(
    (acc, log) => {
      acc.total++;
      if (log.status === "taken" || log.status === "late") acc.taken++;
      else if (log.status === "skipped") acc.skipped++;
      else if (log.status === "missed") acc.missed++;
      return acc;
    },
    { total: 0, taken: 0, skipped: 0, missed: 0 }
  );
  const adherencePct = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 100;

  return NextResponse.json({ logs: logs ?? [], stats: { ...stats, adherencePct, days } });
}
