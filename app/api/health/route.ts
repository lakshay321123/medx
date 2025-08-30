import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasBASE: !!process.env.LLM_BASE_URL,
    hasKEY: !!process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL_ID || process.env.LLM_MODEL || null,
  });
}
