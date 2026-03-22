import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET today's medication schedule with status
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayStr = today.toISOString().split("T")[0];

  // Get active reminders for today's day of week
  const { data: reminders } = await db
    .from("med_reminders")
    .select("*, medications(id, name, dose, frequency, instructions)")
    .eq("user_id", userId)
    .eq("enabled", true)
    .contains("days_of_week", [dayOfWeek]);

  // Get today's adherence logs
  const startOfDay = `${todayStr}T00:00:00.000Z`;
  const endOfDay = `${todayStr}T23:59:59.999Z`;
  const { data: logs } = await db
    .from("med_adherence_log")
    .select("medication_id, reminder_id, status, taken_at")
    .eq("user_id", userId)
    .gte("scheduled_at", startOfDay)
    .lte("scheduled_at", endOfDay);

  const logMap = new Map<string, any>();
  for (const l of logs ?? []) {
    logMap.set(`${l.medication_id}:${l.reminder_id}`, l);
  }

  // Build schedule
  const schedule = (reminders ?? []).map((r) => {
    const log = logMap.get(`${r.medication_id}:${r.id}`);
    return {
      reminderId: r.id,
      medicationId: r.medication_id,
      medicationName: r.medications?.name,
      dose: r.medications?.dose,
      instructions: r.medications?.instructions,
      time: r.reminder_time,
      status: log?.status ?? "pending",
      takenAt: log?.taken_at ?? null,
    };
  }).sort((a, b) => a.time.localeCompare(b.time));

  return NextResponse.json({ date: todayStr, schedule });
}
