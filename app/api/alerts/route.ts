import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { AlertItem } from "@/lib/alerts/types";

let mem: Record<string, AlertItem[]> = {}; // replace with Prisma later

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = url.searchParams.get("u") || "anon";
  return NextResponse.json((mem[user] ?? []).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
}

export async function POST(req: Request) {
  const { user = "anon", ...rest } = await req.json();
  const item: AlertItem = {
    id: nanoid(),
    createdAt: new Date().toISOString(),
    ...(rest as Omit<AlertItem, "id" | "createdAt">),
  };
  mem[user] = [item, ...(mem[user] ?? [])];
  return NextResponse.json(item);
}

export async function PATCH(req: Request) {
  const { user = "anon", id, read = true } = await req.json();
  mem[user] = (mem[user] ?? []).map(a => a.id === id ? { ...a, read } : a);
  return NextResponse.json({ ok: true });
}
