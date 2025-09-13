import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { nanoid } from "nanoid";
import type { AlertItem } from "@/lib/alerts/types";

const mem: Record<string, AlertItem[]> = {}; // replace with Prisma later

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "open").toLowerCase();

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const list = (mem[userId] ?? []).filter(a => {
    if (status === "all") return true;
    if (status === "open") return !a.read;
    if (status === "closed") return !!a.read;
    return true;
  });

  return NextResponse.json(
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const rest = await req.json();
  const item: AlertItem = {
    id: nanoid(),
    createdAt: new Date().toISOString(),
    ...(rest as Omit<AlertItem, "id" | "createdAt">),
  };
  mem[userId] = [item, ...(mem[userId] ?? [])];
  return NextResponse.json(item);
}

export async function PATCH(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const { id, read = true } = await req.json();
  mem[userId] = (mem[userId] ?? []).map(a => a.id === id ? { ...a, read } : a);
  return NextResponse.json({ ok: true });
}
