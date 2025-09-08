import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { aggregateNotes, type ProfileUpdate } from "@/lib/therapy/aggregate";
import OpenAI from "openai";
import { enrichProfileJSON } from "@/lib/therapy/enrich";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const rawLimit = Number(searchParams.get("limit") || 50); // consider last 50 sessions
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 5), 200) : 50;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const sb = supabaseServer();
    const { data: notes, error: e1 } = await sb
      .from("therapy_notes")
      .select("summary, meta, mood, next_step, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    const agg: ProfileUpdate = aggregateNotes(notes || []);

    // Prepare small sample set to help GPT reason (last 5 summaries/emotions)
    const samples = (notes || []).slice(0, 5).map((n: any) => ({
      summary: n?.summary || "",
      emotions: n?.meta?.emotions || []
    }));

    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
        baseURL: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "")
      });
      const enriched = await enrichProfileJSON(openai, {
        topics: agg.topics,
        triggers: agg.triggers,
        mood_stats: agg.mood_stats,
        recent_goals: agg.recent_goals,
        samples
      });

      if (enriched) {
        // merge enrichment into aggregates before upsert
        agg.personality = enriched.personality;
        agg.values = enriched.values as any;
        agg.supports = enriched.supports as any;
      }
    } catch { /* fail-soft */ }

    // UPSERT therapy_profile
    const { error: e2 } = await sb
      .from("therapy_profile")
      .upsert({
        user_id: userId,
        personality: agg.personality,
        topics: agg.topics,
        triggers: agg.triggers,
        values: agg.values,
        supports: agg.supports,
        mood_stats: agg.mood_stats,
        recent_goals: agg.recent_goals,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

    // Append snapshot to therapy_insights (optional audit trail)
    const summary = makePlainSummary(agg);
    const { error: e3 } = await sb
      .from("therapy_insights")
      .insert({
        user_id: userId,
        version: "v1",
        summary,
        aggregates: agg,
        provenance: { source: "aggregateNotes", limit }
      });

    if (e3) {
      // Do not fail the request if insight insert fails
    }

    return NextResponse.json({ ok: true, profile: agg });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

// tiny textual summary for audit/history
function makePlainSummary(agg: ProfileUpdate): string {
  const topTopic = Object.entries(agg.topics).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const topTrigger = Object.entries(agg.triggers).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const mood = agg.mood_stats?.baseline || "neutral";
  const goal = agg.recent_goals?.[agg.recent_goals.length - 1];
  const bits = [];
  if (topTopic) bits.push(`topic: ${topTopic}`);
  if (topTrigger) bits.push(`trigger: ${topTrigger}`);
  bits.push(`mood: ${mood}`);
  if (goal) bits.push(`goal: ${goal}`);
  return bits.join(" | ");
}
