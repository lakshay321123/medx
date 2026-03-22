import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const authUserId = await getUserId();
  const userId = body.userId || authUserId;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const { date, mood, energy, sleepHours, waterCups, exerciseMinutes, painLevel, notes } = body;

  const db = supabaseAdmin();
  // Use client-provided date if available, else UTC today
  const checkDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : new Date().toISOString().split("T")[0];

  const { data, error } = await db
    .from("daily_checkins")
    .upsert({
      user_id: userId, check_date: checkDate,
      mood: mood ?? null, energy: energy ?? null, sleep_hours: sleepHours ?? null,
      water_cups: waterCups ?? null, exercise_minutes: exerciseMinutes ?? null,
      pain_level: painLevel ?? null, notes: notes ?? null,
    }, { onConflict: "user_id,check_date" })
    .select().single();

  if (error) {
    console.error("[checkin] save error:", error);
    return NextResponse.json({ error: "Could not save check-in." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, checkin: data });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const daysRaw = Number(url.searchParams.get("days") || "30");
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 30;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const since = new Date(Date.now() - days * MS_PER_DAY).toISOString().split("T")[0];
  const { data } = await db.from("daily_checkins").select("*").eq("user_id", userId)
    .gte("check_date", since).order("check_date", { ascending: false });

  return NextResponse.json(data ?? []);
}
