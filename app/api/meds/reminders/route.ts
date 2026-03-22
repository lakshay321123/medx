import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("med_reminders")
    .select("*, medications(name, dose, frequency)")
    .eq("user_id", userId)
    .order("reminder_time");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId, medicationId, reminderTime, daysOfWeek, notifyChannel } = body;
  if (!userId || !medicationId || !reminderTime) {
    return NextResponse.json({ error: "userId, medicationId, reminderTime required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("med_reminders")
    .insert({
      user_id: userId,
      medication_id: medicationId,
      reminder_time: reminderTime,
      days_of_week: daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
      notify_channel: notifyChannel ?? "push",
      enabled: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, reminder: data });
}
