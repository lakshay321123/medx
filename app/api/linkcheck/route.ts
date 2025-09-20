import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 4000;

async function headOrGet(url: string) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!response.ok || response.status >= 400) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { Range: "bytes=0-64" },
        signal: ctrl.signal,
      });
    }
    return { ok: response.ok, status: response.status, finalUrl: response.url };
  } catch {
    return { ok: false, status: 0, finalUrl: url };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));
  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, status: 400 }, { status: 400 });
  }
  const result = await headOrGet(url);
  return NextResponse.json(result, { status: 200 });
}
