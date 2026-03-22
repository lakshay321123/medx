import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const clientDate = url.searchParams.get("date"); // client sends YYYY-MM-DD in their timezone
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  // Use client-provided date for timezone safety; fallback to UTC
  const todayStr = (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate))
    ? clientDate
    : new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date(todayStr + "T12:00:00Z").getUTCDay(); // UTC noon avoids DST edge

  const { data: reminders } = await db
    .from("med_reminders")
    .select("*, medications(id, name, dose, frequency, instructions)")
    .eq("user_id", userId).eq("enabled", true).contains("days_of_week", [dayOfWeek]);

  const startOfDay = `${todayStr}T00:00:00.000Z`;
  const endOfDay = `${todayStr}T23:59:59.999Z`;
  const { data: logs } = await db
    .from("med_adherence_log")
    .select("medication_id, reminder_id, status, taken_at")
    .eq("user_id", userId).gte("scheduled_at", startOfDay).lte("scheduled_at", endOfDay);

  const logMap = new Map<string, { status: string; taken_at: string | null }>();
  for (const l of logs ?? []) logMap.set(`${l.medication_id}:${l.reminder_id}`, l);

  const schedule = (reminders ?? []).map((r) => ({
    reminderId: r.id, medicationId: r.medication_id,
    medicationName: r.medications?.name, dose: r.medications?.dose,
    instructions: r.medications?.instructions, time: r.reminder_time,
    status: logMap.get(`${r.medication_id}:${r.id}`)?.status ?? "pending",
    takenAt: logMap.get(`${r.medication_id}:${r.id}`)?.taken_at ?? null,
  })).sort((a, b) => a.time.localeCompare(b.time));

  return NextResponse.json({ date: todayStr, schedule });
}
