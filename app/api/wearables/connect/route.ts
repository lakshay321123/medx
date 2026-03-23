export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await req.json().catch(() => ({}));
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });

  const sb = supabaseAdmin();
  await sb.from("wearable_connections").upsert(
    { user_id: userId, provider, status: "pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: "user_id,provider" }
  );

  // Google OAuth URLs (need client IDs in Vercel env)
  const origin = new URL(req.url).origin;
  const authUrls: Record<string, string | null> = {
    google_fit: process.env.GOOGLE_FIT_CLIENT_ID
      ? `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/fitness.activity.read+https://www.googleapis.com/auth/fitness.heart_rate.read+https://www.googleapis.com/auth/fitness.sleep.read&response_type=code&redirect_uri=${encodeURIComponent(origin + "/api/wearables/callback")}&client_id=${process.env.GOOGLE_FIT_CLIENT_ID}&access_type=offline`
      : null,
    google_calendar: process.env.GOOGLE_CALENDAR_CLIENT_ID
      ? `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/calendar.readonly&response_type=code&redirect_uri=${encodeURIComponent(origin + "/api/wearables/callback")}&client_id=${process.env.GOOGLE_CALENDAR_CLIENT_ID}&access_type=offline`
      : null,
  };

  const authUrl = authUrls[provider];
  if (authUrl) return NextResponse.json({ authUrl, status: "redirecting" });

  return NextResponse.json({ status: "pending", message: `${provider} saved. Configure OAuth keys to enable sync.` });
}
