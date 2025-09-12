import { NextResponse } from "next/server";
import { runCalculatorFinal } from "@/lib/medical/engine/calculators/runFinal";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { name, inputs, precision } = await req.json();
  const out = await runCalculatorFinal(name, inputs, precision);
  return NextResponse.json(out);
}
