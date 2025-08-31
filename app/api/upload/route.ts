// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Forward the multipart/form-data to analyze-doc
    const origin = new URL(req.url).origin;

    // Re-create the FormData, because req.body cannot be safely re-used
    const form = await req.formData();
    const upstream = await fetch(`${origin}/api/analyze-doc`, {
      method: 'POST',
      body: form,            // pass the form directly
      cache: 'no-store',
    });

    // Always read text first
    let text = '';
    try { text = await upstream.text(); } catch { text = ''; }

    // Guarantee a JSON object back to the client
    if (!text || !text.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Empty response from /api/analyze-doc' },
        { status: upstream.status || 502 }
      );
    }

    // If upstream is JSON, forward it; else wrap as error
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: upstream.status });
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Upstream not JSON', raw: text },
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
