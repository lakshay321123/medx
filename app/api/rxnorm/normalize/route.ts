import { NextRequest, NextResponse } from "next/server";

async function rxcuiForName(name: string): Promise<string | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  try {
    const j = await res.json();
    return j?.idGroup?.rxnormId?.[0] || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") || "").trim();
  if (!name) {
    return NextResponse.json({ meds: [] });
  }
  const rxcui = await rxcuiForName(name);
  return NextResponse.json({ meds: rxcui ? [{ name, rxcui }] : [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const nameInput = typeof body?.name === "string" ? body.name.trim() : "";
  if (nameInput) {
    const rxcui = await rxcuiForName(nameInput);
    return NextResponse.json({ meds: rxcui ? [{ name: nameInput, rxcui }] : [] });
  }

  const text = typeof body?.text === "string" ? body.text : "";
  if (!text) {
    return NextResponse.json({ meds: [] });
  }

  const tokens = Array.from(
    new Set(
      String(text)
        .split(/[^A-Za-z0-9-]+/)
        .map(token => token.trim())
        .filter(token => token.length > 2)
    )
  ).slice(0, 120);

  const meds: { name: string; rxcui: string }[] = [];
  for (const token of tokens) {
    try {
      const rxcui = await rxcuiForName(token);
      if (rxcui) {
        meds.push({ name: token, rxcui });
      }
    } catch {
      // ignore
    }
  }

  const dedup = Array.from(
    meds.reduce((acc, item) => {
      if (!acc.has(item.rxcui)) {
        acc.set(item.rxcui, item);
      }
      return acc;
    }, new Map<string, { name: string; rxcui: string }>()).values()
  );

  return NextResponse.json({ meds: dedup });
}
