import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableUSDA) return NextResponse.json({ disabled: true });
  const params = new URL(req.url).searchParams;
  const q = params.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const size = params.get("size") || "5";

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", process.env.USDA_FDC_API_KEY || "");

  const r = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, pageSize: Number(size) }),
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();

  const foods = (j.foods || []).map((f: any) => ({
    fdcId: f.fdcId,
    description: f.description,
    brandOwner: f.brandOwner,
    nutrients: (f.foodNutrients || []).map((n: any) => ({
      name: n.nutrientName,
      unit: n.unitName,
      value: n.value,
    })),
  }));

  return NextResponse.json({ foods });
}
