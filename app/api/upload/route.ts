// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // forward the original body stream & headers
    const origin = new URL(req.url).origin;
    const upstream = await fetch(`${origin}/api/analyze-doc`, {
      method: 'POST',
      body: req.body,      // IMPORTANT: forward stream
      headers: req.headers // preserves multipart boundary
    });

    const text = await upstream.text(); // might be JSON text or error text
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
