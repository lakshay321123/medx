import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { searchNCBIBooks } from "@/lib/books_ncbi";

export async function GET(req: NextRequest) {
  if (!flags.enableBooksNCBI) return NextResponse.json({ disabled: true });

  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const rows = await searchNCBIBooks(q, 10);
  return NextResponse.json({ rows });
}
