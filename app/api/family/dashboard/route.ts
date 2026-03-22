import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const familyId = url.searchParams.get("familyId");
  if (!familyId) return NextResponse.json({ error: "familyId required" }, { status: 400 });

  const db = supabaseAdmin();

  const { data: members } = await db
    .from("family_members")
    .select("id, display_name, relationship, dob, sex, patient_id, user_id")
    .eq("family_id", familyId)
    .eq("invite_status", "active");

  // For each member, get their latest health score
  const dashboard = await Promise.all(
    (members ?? []).map(async (m) => {
      const lookupId = m.user_id || m.patient_id;
      let latestScore = null;
      let alerts = 0;
      let medsDue = 0;

      if (lookupId) {
        const { data: hs } = await db
          .from("health_scores")
          .select("overall_score, delta, streak_days, computed_at")
          .eq("user_id", lookupId)
          .order("computed_at", { ascending: false })
          .limit(1)
          .single();
        latestScore = hs;

        const { count } = await db
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", lookupId)
          .eq("status", "open");
        alerts = count ?? 0;
      }

      return {
        ...m,
        healthScore: latestScore?.overall_score ?? null,
        scoreDelta: latestScore?.delta ?? null,
        streakDays: latestScore?.streak_days ?? 0,
        openAlerts: alerts,
      };
    })
  );

  return NextResponse.json(dashboard);
}
