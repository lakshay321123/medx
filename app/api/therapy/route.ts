import { NextRequest, NextResponse } from 'next/server';

const OAI_KEY = process.env.OPENAI_API_KEY!;
const OAI_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const MODEL   = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
const ENABLED = String(process.env.THERAPY_MODE_ENABLED||'').toLowerCase()==='true';

import { crisisCheck } from '@/lib/therapy/crisis';
import { THERAPY_SYSTEM, friendlyStarter } from '@/lib/therapy/scripts';
import { moderate } from '@/lib/therapy/moderation';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  if (!ENABLED) return NextResponse.json({ error: 'Therapy mode disabled' }, { status: 403 });
  try {
    const { messages, wantStarter } = await req.json();

    // Optionally kick off with a friendly starter
    if (wantStarter) {
      return NextResponse.json({
        starter: friendlyStarter(),
        disclaimer: process.env.THERAPY_DISCLAIMER || '',
        crisisBanner: process.env.CRISIS_BANNER_TEXT || ''
      });
    }

    const userText = (messages || []).map((m: any) => m.content || '').join('\n').slice(-2000);
    const crisisFlag = crisisCheck(userText);
    const moderation = await moderate(userText).catch(() => null);

    const sys = [
      { role: 'system', content: THERAPY_SYSTEM },
      ...(process.env.THERAPY_DISCLAIMER ? [{ role: 'system', content: `DISCLAIMER: ${process.env.THERAPY_DISCLAIMER}` }] : [])
    ];

    const r = await fetch(`${OAI_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          ...sys,
          ...messages
        ],
        temperature: 0.7
      })
    });

    if (!r.ok) {
      const err = await r.text().catch(() => '');
      return NextResponse.json({ error: `OpenAI ${r.status}`, detail: err }, { status: r.status });
    }
    const data = await r.json();

    return NextResponse.json({
      ok: true,
      completion: data?.choices?.[0]?.message?.content || '',
      crisis: crisisFlag,
      moderation
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

