import { NextResponse } from 'next/server';

const OAI_KEY = process.env.OPENAI_API_KEY!;
const OAI_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-5';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const doctorMode = (fd.get('doctorMode') || 'false').toString() === 'true';

    if (!file) {
      return NextResponse.json({ error: 'file missing' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = buf.toString('base64');
    const dataUrl = `data:application/pdf;base64,${b64}`;

    const patientPrompt = [
      { type: 'text', text: 'Please summarize this medical report for a patient.' },
      { type: 'image_url', image_url: { url: dataUrl } },
    ];

    const doctorPrompt = [
      {
        type: 'text',
        text: 'Summarize this report for a doctor with headings (HPI, Results, Interpretation, Plan, Red Flags, Limitations).',
      },
      { type: 'image_url', image_url: { url: dataUrl } },
    ];

    // Patient summary
    const pResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a medical explainer. Use clear, non-alarming language.' },
          { role: 'user', content: patientPrompt },
        ],
        temperature: 0.2,
      }),
    });
    const pJson = await pResp.json();
    const patientSummary = pJson.choices?.[0]?.message?.content || '';

    // Doctor summary
    let doctorSummary: string | null = null;
    if (doctorMode) {
      const dResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OAI_MODEL,
          messages: [
            { role: 'system', content: 'You are a clinician. Write structured notes.' },
            { role: 'user', content: doctorPrompt },
          ],
          temperature: 0.2,
        }),
      });
      const dJson = await dResp.json();
      doctorSummary = dJson.choices?.[0]?.message?.content || '';
    }

    return NextResponse.json({
      patient: patientSummary,
      doctor: doctorMode ? doctorSummary : null,
      disclaimer: 'AI assistance only — not a medical diagnosis. Confirm with a clinician.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'analyze-doc failed' }, { status: 500 });
  }
}

