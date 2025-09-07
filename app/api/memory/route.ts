import { NextResponse } from "next/server";
import { upsertProfileMemory } from "@/lib/memory/store";

export async function POST(req: Request) {
  const { threadId, key, value } = await req.json();
  const mem = await upsertProfileMemory(threadId, key, value);
  return NextResponse.json({ ok: true, memory: { key: mem.key, value: mem.value } });
}
