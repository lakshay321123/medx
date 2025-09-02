import { NextResponse } from 'next/server';

const OAI_KEY = process.env.OPENAI_API_KEY!;
const OAI_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-5';

export const runtime = 'nodejs';

function toDataUrl(buf: Buffer, mime = 'image/jpeg') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = (fd.get('file') || fd.get('image') || fd.get('files[]')) as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "image missing (send as 'file', 'image', or 'files[]')" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || 'image/jpeg';
    const dataUrl = toDataUrl(buf, mime);

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OAI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a radiologist. Write a structured X-ray report: Technique, Findings, Impression (≤3 bullets, cautious language), Recommendations, Limitations.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please analyze this X-ray image and generate a radiology-style report.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    const j = await resp.json();
    const report = j.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      report,
      disclaimer: 'AI assistance only — not a medical diagnosis. Confirm with a clinician.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'imaging analyze failed' }, { status: 500 });
  }
}

