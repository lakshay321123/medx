import { NextRequest, NextResponse } from "next/server";
import { detectLifestyleQuery, getLifestyleTips } from "@/lib/lifestyleTips";
import { FEATURES } from "@/lib/config";
import { translateFields } from "@/lib/i18n/healthEdu";

export async function POST(req: NextRequest) {
  if (process.env.LIFESTYLE_TIPS_ENABLED !== "true") {
    return NextResponse.json({ disabled: true });
  }
  const { text, lang = "en" } = await req.json();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (!detectLifestyleQuery(text)) {
    return NextResponse.json({ match: false });
  }
  const tips = getLifestyleTips();
  if (FEATURES.MULTILINGUAL_HEALTH_EDU && lang !== "en") {
    await translateFields(tips.lifestyle, lang, ["nutrition", "exercise", "stress"]);
    if ((tips.lifestyle as any).meta?.translation === "fallback") {
      tips.meta = { translation: "fallback" };
      delete (tips.lifestyle as any).meta;
    }
  }
  return NextResponse.json(tips);
}
