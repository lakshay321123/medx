export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasDb: !!process.env.DATABASE_URL,
    hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    models: {
      smart: process.env.MODEL_SMART || "gpt-5",
      balanced: process.env.MODEL_BALANCED || "gpt-4.1",
      fast: process.env.MODEL_FAST || "gpt-4o-mini",
    },
  });
}
