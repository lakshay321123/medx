import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({
    LLM_BASE_URL: !!process.env.LLM_BASE_URL,
    LLM_MODEL_ID: !!process.env.LLM_MODEL_ID,
    LLM_API_KEY:  !!process.env.LLM_API_KEY,
    UMLS_API_KEY: !!process.env.UMLS_API_KEY,
    OCRSPACE_API_KEY: !!process.env.OCRSPACE_API_KEY
  });
}
