import { NextResponse } from "next/server";
import { runCalculatorFinal } from "@/lib/medical/engine/calculators/runFinal";

export async function POST(req: Request) {
  const { name, inputs, precision, tolerancePct, strict } = await req.json();
  const verdict = await runCalculatorFinal(name, inputs, { precision, tolerancePct, strict });
  return NextResponse.json(verdict);
}
