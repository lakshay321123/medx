export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasDb: !!process.env.DATABASE_URL,
    hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasGroq: !!process.env.LLM_API_KEY,
  });
}
