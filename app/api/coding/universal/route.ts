import { NextResponse } from 'next/server';
import { generateUniversalAnswer, type UniversalCodingInput, type UniversalCodingMode } from '@/lib/coding/generateUniversalAnswer';

export const runtime = 'nodejs';

function isValidMode(value: unknown): value is UniversalCodingMode {
  return value === 'doctor' || value === 'doctor_research';
}

function isValidInput(value: unknown): value is UniversalCodingInput {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const clinicalContext = record.clinicalContext;
  if (typeof clinicalContext !== 'string' || clinicalContext.trim().length === 0) {
    return false;
  }
  if (record.specialty !== undefined && typeof record.specialty !== 'string') {
    return false;
  }
  if (record.suspectedDiagnosis !== undefined && typeof record.suspectedDiagnosis !== 'string') {
    return false;
  }
  if (record.procedureDetails !== undefined && typeof record.procedureDetails !== 'string') {
    return false;
  }
  if (record.payer !== undefined && typeof record.payer !== 'string') {
    return false;
  }
  if (record.placeOfService !== undefined && typeof record.placeOfService !== 'string') {
    return false;
  }
  if (record.additionalNotes !== undefined && typeof record.additionalNotes !== 'string') {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const mode = (body as Record<string, unknown>).mode;
    const input = (body as Record<string, unknown>).input;

    if (!isValidMode(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (!isValidInput(input)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const answer = await generateUniversalAnswer(input, mode);
    return NextResponse.json({ data: answer }, { status: 200 });
  } catch (error) {
    console.error('universal coding guide error', error);
    return NextResponse.json({ error: 'Failed to generate coding guidance' }, { status: 500 });
  }
}
