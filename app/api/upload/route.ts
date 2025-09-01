// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const origin = new URL(req.url).origin;
    const form = await req.formData();

    const upstream = await fetch(`${origin}/api/analyze-doc`, {
      method: 'POST',
      body: form,
      cache: 'no-store',
      // Important: let our own API return JSON even if upstream misbehaves
      // (we'll parse its text by ourselves below)
    });

    let text = '';
    try { text = await upstream.text(); } catch { text = ''; }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Empty response from /api/analyze-doc' },
        { status: upstream.status || 502 }
      );
    }

    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: upstream.status });
    } catch {
      // If upstream returned HTML or garbage, still return valid JSON
      return NextResponse.json(
        { ok: false, error: 'Upstream not JSON', raw: text.slice(0, 2000) },
        { status: upstream.status || 502 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

// Optional: quick GET health check for debugging
export async function GET() {
  return NextResponse.json({ ok: true, ping: 'upload-api-alive' });
}
