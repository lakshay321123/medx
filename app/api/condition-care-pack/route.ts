import { NextRequest, NextResponse } from "next/server";
import { getConditionCarePack } from "@/lib/conditionCarePacks";

export async function POST(req: NextRequest) {
  if (process.env.CONDITION_CARE_PACKS !== "true") {
    return NextResponse.json({ disabled: true });
  }
  const { condition, region } = await req.json();
  if (!condition) {
    return NextResponse.json({ error: "condition required" }, { status: 400 });
  }
  return NextResponse.json(getConditionCarePack(condition, region));
}
