import { NextResponse } from 'next/server';

import { generateUniversalAnswerServer } from '@/lib/coding/generateUniversalAnswer';
import { CodingMode } from '@/types/coding';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode: CodingMode = body?.mode === 'doctor_research' ? 'doctor_research' : 'doctor';
    const input = body?.input && typeof body.input === 'object' ? body.input : {};
    const data = await generateUniversalAnswerServer(input, mode);
    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || 'Unable to generate coding guidance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
