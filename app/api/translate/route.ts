import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const cache = new Map<string, string>();

const DEFAULT_TIMEOUT = Number(process.env.MT_TIMEOUT_MS || 6500);
const ORDER = String(process.env.MT_PROVIDER_ORDER || 'google,openai')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean) as Array<'google' | 'openai'>;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));

  // Batch mode
  if (Array.isArray(body.textBlocks) && body.target) {
    const lang = String(body.target);
    const providers = pickProviders(body.provider);
    const out: string[] = [];
    for (const t of body.textBlocks) {
      out.push(await translateOne(String(t || ''), lang, providers));
    }
    return NextResponse.json({ blocks: out }, noStore());
  }

  // Single mode
  const text = String(body.text || '');
  const lang = String(body.target || body.lang || '');
  const providers = pickProviders(body.provider);
  const translated = await translateOne(text, lang, providers);
  return NextResponse.json({ translated }, noStore());
}

function noStore() {
  return { headers: { 'Cache-Control': 'no-store, max-age=0' } };
}

function pickProviders(override?: string | null): Array<'google'|'openai'> {
  const ov = typeof override === 'string' ? override.toLowerCase().trim() : '';
  if (ov === 'google') return ['google', 'openai'];
  if (ov === 'openai') return ['openai', 'google'];
  return ORDER.length ? ORDER : ['google', 'openai'];
}

async function translateOne(text: string, lang: string, order: Array<'google'|'openai'>): Promise<string> {
  const key = `${text}::${lang}`;
  if (cache.has(key)) return cache.get(key)!;

  let lastError: any = null;
  for (const provider of order) {
    try {
      const out = await withTimeout(
        provider === 'google' ? translateGoogle(text, lang) : translateOpenAI(text, lang),
        DEFAULT_TIMEOUT
      );
      if (out) {
        const trimmed = String(out).trim();
        cache.set(key, trimmed);
        return trimmed;
      }
    } catch (err) {
      lastError = err;
      // try next provider
    }
  }
  throw lastError || new Error('MT providers unavailable');
}

function decodeHtmlEntities(s: string): string {
  // minimal decoder for common entities returned by Google
  return String(s || '')
    .replaceAll('&quot;', '"')
    .replaceAll('&#34;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

async function translateGoogle(text: string, lang: string): Promise<string> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error('GOOGLE_TRANSLATE_API_KEY missing');

  const url = `https://translation.googleapis.com/language/translate/v2?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Important: do NOT strip newlines, pass as-is
    body: JSON.stringify({ q: text, target: lang })
  });
  if (!res.ok) throw new Error(`Google MT HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const translated = data?.data?.translations?.[0]?.translatedText;
  if (!translated) throw new Error('Google MT empty');
  // Fix entities → proper Unicode, keep original line structure
  return decodeHtmlEntities(translated);
}

async function translateOpenAI(text: string, lang: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');

  // Hard lock to GPT-5
  const model = 'gpt-5';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Translate the user text. Only output the translated text.' },
        { role: 'user', content: `Translate to ${lang}: ${text}` }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI MT HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const translated = data?.choices?.[0]?.message?.content?.trim();
  if (!translated) throw new Error('OpenAI MT empty');
  return translated;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`MT timeout after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(id); resolve(v); })
     .catch(e => { clearTimeout(id); reject(e); });
  });
}
