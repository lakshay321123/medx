import { NextRequest, NextResponse } from "next/server";
import { getConditionCarePack } from "@/lib/conditionCarePacks";
import { FEATURES } from "@/lib/config";
import { translateFields } from "@/lib/i18n/healthEdu";

export async function POST(req: NextRequest) {
  if (process.env.CONDITION_CARE_PACKS !== "true") {
    return NextResponse.json({ disabled: true });
  }
  const { condition, region, lang = "en" } = await req.json();
  if (!condition) {
    return NextResponse.json({ error: "condition required" }, { status: 400 });
  }
  const pack = getConditionCarePack(condition, region);
  if (FEATURES.MULTILINGUAL_HEALTH_EDU && lang !== "en") {
    await translateFields(pack.carePack, lang, [
      "lifestyle",
      "monitoring",
      "adherence",
      "red_flags",
      "legal",
    ]);
    if ((pack.carePack as any).meta?.translation === "fallback") {
      pack.meta = { translation: "fallback" };
      delete (pack.carePack as any).meta;
    }
  }
  return NextResponse.json(pack);
}
