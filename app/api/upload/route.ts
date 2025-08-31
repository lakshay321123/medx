// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const origin = new URL(req.url).origin;
    const upstream = await fetch(`${origin}/api/analyze-doc`, {
      method: 'POST',
      body: req.body,  // directly forward stream
      headers: req.headers,
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
