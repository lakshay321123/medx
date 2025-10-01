// app/api/directory/_mt.ts
// Server-only MT with batching + in-memory TTL cache.
// Provider is pluggable via env: MT_PROVIDER=("google"|"openai"), keys required server-side only.

import "server-only";

type MTProvider = "google" | "openai";
const PROVIDER = (process.env.MT_PROVIDER as MTProvider) || "google";
const TARGETS = new Set(["en", "hi", "ar", "es", "it", "zh", "fr"]);

function decodeHtmlEntities(s: string): string {
  return String(s || "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

type Entry<T> = { v: T; exp: number };
const cache = new Map<string, Entry<string>>();
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TTL_MS = Number(process.env.MT_TTL_MS ?? DEFAULT_TTL_MS);

function cacheKey(text: string, to: string) {
  return `mt:${to}:${text}`;
}

function getCached(text: string, to: string) {
  const key = cacheKey(text, to);
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.exp) {
    cache.delete(key);
    return undefined;
  }
  return entry.v;
}

function setCached(text: string, to: string, value: string) {
  cache.set(cacheKey(text, to), { v: value, exp: Date.now() + TTL_MS });
}

export async function translateBatchStrict(texts: string[], to: string): Promise<string[]> {
  if (!texts.length) return [];
  const target = TARGETS.has(to) ? to : "en";

  const outputs = new Array<string>(texts.length);
  const pending = new Map<string, number[]>();

  texts.forEach((text, index) => {
    if (!text) {
      outputs[index] = "";
      return;
    }
    const cached = getCached(text, target);
    if (typeof cached === "string") {
      outputs[index] = cached;
    } else {
      const list = pending.get(text) ?? [];
      list.push(index);
      pending.set(text, list);
    }
  });

  const toTranslate = Array.from(pending.keys());
  if (toTranslate.length > 0) {
    const translations = await callProviderBatch(toTranslate, target);
    toTranslate.forEach((source, idx) => {
      const translated = translations[idx] ?? source;
      setCached(source, target, translated);
      const slots = pending.get(source) ?? [];
      slots.forEach(slot => {
        outputs[slot] = translated;
      });
    });
  }

  return outputs.map((value, idx) => {
    if (typeof value === "string" && value.length > 0) return value;
    const original = texts[idx];
    if (!original) return "";
    const cached = getCached(original, target);
    return typeof cached === "string" ? cached : original;
  });
}

async function callProviderBatch(texts: string[], target: string): Promise<string[]> {
  if (!texts.length) return [];
  const prefer = (PROVIDER || "google").toLowerCase();

  const tryGoogle = async () => googleTranslateV2(texts, target);
  const tryOpenAI = async (subset?: string[]) => openAITranslate(subset ?? texts, target);

  const safe = (arr: string[]) => {
    return arr?.length === texts.length ? arr : texts;
  };

  if (prefer === "google") {
    const g = await tryGoogle();
    if (g && g.some(Boolean)) return safe(g);

    const o = await tryOpenAI();
    return safe(o);
  } else if (prefer === "openai") {
    const o = await tryOpenAI();
    if (o && o.some(Boolean)) return safe(o);

    const g = await tryGoogle();
    return safe(g);
  }

  return texts;
}

// GOOGLE Translate v2 (paid). Ensure GOOGLE_TRANSLATE_API_KEY is set.
async function googleTranslateV2(texts: string[], target: string): Promise<string[]> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return texts;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${key}`;
    const body = { q: texts, target, format: "text" };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return texts;
    const json = await res.json();
    const arr = Array.isArray(json?.data?.translations) ? json.data.translations : [];
    return arr.map((item: any, idx: number) => {
      const translated = typeof item?.translatedText === "string" ? item.translatedText : undefined;
      return decodeHtmlEntities(translated ?? texts[idx] ?? "");
    });
  } catch {
    return texts;
  } finally {
    clearTimeout(timeout);
  }
}

// OPENAI (cheap MT via small model). Ensure OPENAI_API_KEY is set.
async function openAITranslate(texts: string[], target: string): Promise<string[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return texts;
  const out: string[] = [];
  for (const text of texts) {
    if (!text) {
      out.push("");
      continue;
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Translate to ${target}. Return only the translation.` },
          { role: "user", content: text },
        ],
        temperature: 0,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      out.push(text);
      continue;
    }
    const json = await res.json();
    const translated = json?.choices?.[0]?.message?.content?.trim();
    out.push(translated ?? text);
  }
  return out;
}

export { TTL_MS as MT_CACHE_TTL_MS };
