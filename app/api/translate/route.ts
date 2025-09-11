import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const cache = new Map<string, string>();

export async function POST(req: NextRequest) {
  const body = await req.json();

  // === Batch translation for health education ===
  if (Array.isArray(body.textBlocks) && body.target) {
    const lang = String(body.target);
    const out: string[] = [];
    for (const t of body.textBlocks) {
      const text = String(t || "");
      const key = `${text}:${lang}`;
      if (cache.has(key)) {
        out.push(cache.get(key)!);
        continue;
      }
      let translated = `[${lang}] ${text}`;
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Translate the user text.' },
                { role: 'user', content: `Translate to ${lang}: ${text}` }
              ]
            })
          });
          if (res.ok) {
            const data = await res.json();
            translated = data.choices?.[0]?.message?.content?.trim() || translated;
          }
        }
      } catch {}
      cache.set(key, translated);
      out.push(translated);
    }
    return NextResponse.json({ blocks: out });
  }

  // === Single-string translation ===
  const { text, lang, id } = body;
  const key = `${id ?? text}:${lang}`;
  if (cache.has(key)) {
    return NextResponse.json({ translated: cache.get(key) });
  }
  let translated = `[${lang}] ${text}`;
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Translate the user text.' },
            { role: 'user', content: `Translate to ${lang}: ${text}` }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        translated = data.choices?.[0]?.message?.content?.trim() || translated;
      }
    }
  } catch {}
  cache.set(key, translated);
  return NextResponse.json({ translated });
}
