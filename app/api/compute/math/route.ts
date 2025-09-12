import { NextResponse } from "next/server";
import { evalMath, derive, simplify, solveEqn } from "@/lib/compute/math";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { op, expr, var: v } = await req.json();
  try {
    const out =
      op === "eval" ? evalMath(expr) :
      op === "derive" ? derive(expr, v || "x") :
      op === "simplify" ? simplify(expr) :
      op === "solve" ? solveEqn(expr, v || "x") :
      (() => { throw new Error("Unknown op"); })();
    return NextResponse.json({ ok: true, out });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e.message||e) }, { status: 400 });
  }
}
