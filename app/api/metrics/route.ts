import { NextRequest, NextResponse } from 'next/server';

// NOTE: On serverless this is per-instance and ephemeral.
// Good enough for MVP; swap to a real store later.
let counters: Record<string, number> = {};

export async function POST(req: NextRequest) {
  const { event, extra } = await req.json();
  counters[event] = (counters[event] || 0) + 1;
  console.log('[METRICS]', event, extra || {});
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ counters });
}
