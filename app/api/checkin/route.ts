import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId, mood, energy, sleepHours, waterCups, exerciseMinutes, painLevel, notes } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await db
    .from("daily_checkins")
    .upsert(
      {
        user_id: userId,
        check_date: today,
        mood: mood ?? null,
        energy: energy ?? null,
        sleep_hours: sleepHours ?? null,
        water_cups: waterCups ?? null,
        exercise_minutes: exerciseMinutes ?? null,
        pain_level: painLevel ?? null,
        notes: notes ?? null,
      },
      { onConflict: "user_id,check_date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checkin: data });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const days = Number(url.searchParams.get("days") || "30");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const { data } = await db
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("check_date", since)
    .order("check_date", { ascending: false });

  return NextResponse.json(data ?? []);
}
