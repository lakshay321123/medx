import { NextResponse } from "next/server";

import { generateUniversalAnswer } from "@/lib/coding/generateUniversalAnswer";
import type { CodingMode } from "@/types/coding";

export async function POST(req: Request) {
  try {
    const { input, mode } = (await req.json()) as { input?: Record<string, any>; mode?: CodingMode };
    if (mode !== "doctor" && mode !== "doctor_research") {
      return NextResponse.json({ error: "Invalid coding mode" }, { status: 400 });
    }
    const data = await generateUniversalAnswer(input ?? {}, mode);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to generate coding guidance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
