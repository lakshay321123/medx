import { NextResponse } from "next/server";

const RX = {
  allergy: /\ballergic to\s+([a-z0-9\s\-]+)/i,
  med: /\bon\s+([A-Za-z][A-Za-z0-9\-\s]+)\s*(\d+\s*(mg|mcg|iu))?/i,
  diet: /\b(vegetarian|vegan|keto|gluten[-\s]*free|low\s*carb)\b/i,
};

export async function POST(req: Request) {
  const { text, thread_id } = await req.json();
  const out: any[] = [];

  const allergy = RX.allergy.exec(text);
  if (allergy) out.push({ key: "allergy", value: { item: allergy[1].trim() }, scope: "global" });

  const med = RX.med.exec(text);
  if (med) out.push({ key: "medication", value: { name: med[1], dose: med[2] }, scope: "thread", thread_id });

  const diet = RX.diet.exec(text);
  if (diet) out.push({ key: "diet_preference", value: { label: diet[1].toLowerCase() }, scope: "global" });

  return NextResponse.json({ suggestions: out });
}
