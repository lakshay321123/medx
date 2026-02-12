import { NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json([]);

  const supabase = db();
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id,user_id,title,mode,created_at,updated_at")
    .eq("user_id", userId)
    .eq("mode", "aidoc")
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}
