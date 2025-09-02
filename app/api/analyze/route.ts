import { NextResponse } from 'next/server';
import { openaiVision } from '@/lib/llm';

export const runtime = 'nodejs';

const SYS_PATIENT = 'You are a medical explainer. Use clear, calm, non-alarming language (8th–10th grade).';
const SYS_DOCTOR = 'You are a clinician. Write structured notes. Be concise and evidence-based.';
const SYS_RAD = 'You are a radiologist. Write a structured X-ray report (Technique, Findings, Impression \u22643 bullets with cautious language, Recommendations, Limitations).';

function fileToDataUrl(file: File): Promise<string> {
  return file.arrayBuffer().then(buf => {
    const b64 = Buffer.from(buf).toString('base64');
    return `data:${file.type};base64,${b64}`;
  });
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const doctorMode = (fd.get('doctorMode') || 'false').toString() === 'true';
    if (!file) return NextResponse.json({ error: 'file missing' }, { status: 400 });

    const mime = file.type || '';
    const dataUrl = await fileToDataUrl(file);

    if (mime.includes('pdf')) {
      const patient = await openaiVision({
        system: SYS_PATIENT,
        prompt: 'Please summarize this medical report for a patient.',
        imageDataUrl: dataUrl,
        model: process.env.OPENAI_TEXT_MODEL,
      });
      let doctor: string | null = null;
      if (doctorMode) {
        doctor = await openaiVision({
          system: SYS_DOCTOR,
          prompt: 'Summarize for a doctor with headings: HPI/Context, Key Results, Interpretation, Plan, Red Flags, Limitations.',
          imageDataUrl: dataUrl,
          model: process.env.OPENAI_TEXT_MODEL,
        });
      }
      return NextResponse.json({
        type: 'pdf',
        patient,
        doctor,
        disclaimer: 'AI assistance only — not a medical diagnosis. Confirm with a clinician.',
      });
    }

    // default: treat as image
    const report = await openaiVision({
      system: SYS_RAD,
      prompt: 'Analyze this X-ray and generate a radiology-style report.',
      imageDataUrl: dataUrl,
      model: process.env.OPENAI_VISION_MODEL,
    });
    return NextResponse.json({
      type: 'image',
      report,
      disclaimer: 'AI assistance only — not a medical diagnosis. Confirm with a clinician.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'analyze failed' }, { status: 500 });
  }
}

