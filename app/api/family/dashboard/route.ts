import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = new URL(req.url).searchParams.get("familyId");
  if (!familyId) return NextResponse.json({ error: "familyId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: membership } = await db.from("family_members").select("id").eq("family_id", familyId).eq("user_id", userId).eq("invite_status", "active").single();
  if (!membership) return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });

  const { data: members } = await db.from("family_members")
    .select("id, display_name, relationship, dob, sex, patient_id, user_id")
    .eq("family_id", familyId).eq("invite_status", "active");

  const lookupIds = (members ?? []).map((m) => m.user_id || m.patient_id).filter(Boolean) as string[];
  const [{ data: scores }, { data: alerts }] = await Promise.all([
    lookupIds.length ? db.from("health_scores").select("user_id, overall_score, delta, streak_days").in("user_id", lookupIds).order("computed_at", { ascending: false }) : { data: [] as any[] },
    lookupIds.length ? db.from("alerts").select("user_id").in("user_id", lookupIds).eq("status", "open") : { data: [] as any[] },
  ]);

  const scoreMap = new Map<string, { overall_score: number; delta: number | null; streak_days: number }>();
  for (const s of scores ?? []) { if (!scoreMap.has(s.user_id)) scoreMap.set(s.user_id, s); }
  const alertCounts = new Map<string, number>();
  for (const a of alerts ?? []) { alertCounts.set(a.user_id, (alertCounts.get(a.user_id) ?? 0) + 1); }

  return NextResponse.json((members ?? []).map((m) => {
    const lid = m.user_id || m.patient_id;
    const sc = lid ? scoreMap.get(lid) : null;
    return { ...m, healthScore: sc?.overall_score ?? null, scoreDelta: sc?.delta ?? null, streakDays: sc?.streak_days ?? 0, openAlerts: lid ? (alertCounts.get(lid) ?? 0) : 0 };
  }));
}
