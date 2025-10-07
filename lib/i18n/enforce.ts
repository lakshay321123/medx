import { HEADING_MAP } from '@/lib/i18n/headingMap';
import { normalizeHeadingKey } from '@/lib/i18n/headingKey';
import { localizeDigits } from '@/lib/i18n/numeral';

const SAFE = '__SAFESEG__';
const SAFE_RE = new RegExp(`${SAFE}([A-Z]+)__`, 'g');
const TABLE_SAFE = '__SAFETBL__';
const TABLE_SAFE_RE = new RegExp(`${TABLE_SAFE}([A-Z]+)__`, 'g');
const MEDX_RE = /MEDX_MASK_(\d+)/g;

function numberToAlpha(n: number): string {
  let value = n + 1;
  let out = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    out = String.fromCharCode(65 + remainder) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
}

function alphaToNumber(alpha: string): number {
  let result = 0;
  for (let i = 0; i < alpha.length; i += 1) {
    result = result * 26 + (alpha.charCodeAt(i) - 64);
  }
  return result - 1;
}

function protect(text: string) {
  const slots: string[] = [];
  const out = text.replace(/(`[^`]+`|\[[^\]]+\]\([^\)]+\))/g, segment => {
    const token = `${SAFE}${numberToAlpha(slots.length)}__`;
    slots.push(segment);
    return token;
  });
  return { out, slots };
}

function restore(text: string, slots: string[]) {
  return text.replace(SAFE_RE, (_match, alpha) => {
    const idx = alphaToNumber(alpha as string);
    return slots[idx] ?? '';
  });
}

function protectTableBlocks(text: string) {
  const slots: string[] = [];
  const protect = (segment: string) => {
    const token = `${TABLE_SAFE}${numberToAlpha(slots.length)}__`;
    slots.push(segment);
    return token;
  };

  let out = text.replace(/(^\|[^\n]+\|\n\|[ :\-|]+\|\n(?:\|.*\|\n?)+)/gm, segment => protect(segment));
  out = out.replace(/^\|[ :\-|]+\|$/gm, segment => protect(segment));
  return { out, slots };
}

function restoreTableBlocks(text: string, slots: string[]) {
  if (!slots.length) return text;
  return text.replace(TABLE_SAFE_RE, (_match, alpha) => {
    const idx = alphaToNumber(alpha as string);
    return slots[idx] ?? '';
  });
}

function unmask(text: string, map?: Record<string, string>) {
  if (!map) return text.replace(MEDX_RE, '');
  return text.replace(MEDX_RE, (_match, id) => map[`MEDX_MASK_${id}`] ?? '');
}

function stripHeadingParens(text: string) {
  const md = /^(#{1,4}\s*.+?)\s*\(([^)]+)\)\s*$/gm;
  let out = text.replace(md, (_match, head) => String(head).trim());
  const bold = /^(\*\*.+?\*\*)\s*\(([^)]+)\)\s*$/gm;
  out = out.replace(bold, (_match, head) => String(head).trim());
  return out;
}

function rewriteHeadings(text: string, lang: string) {
  const map = HEADING_MAP[lang];
  if (!map) return text;

  let out = text.replace(/^(#{1,4}\s*)([^\n]+)$/gm, (_match, hashes, title) => {
    const key = normalizeHeadingKey(String(title));
    const tr = map[key];
    return tr ? `${hashes}${tr}` : `${hashes}${title}`;
  });

  out = out.replace(/^(\*\*)([^*]+)(\*\*)\s*$/gm, (_match, open, title, close) => {
    const key = normalizeHeadingKey(String(title));
    const tr = map[key];
    return tr ? `${open}${tr}${close}` : `${open}${title}${close}`;
  });

  return out;
}

/** The invariant: call this on EVERY model text before display or network send. */
export function enforceLocale(
  raw: string,
  lang: string,
  opts?: { maskLookup?: Record<string, string>; forbidEnglishHeadings?: boolean },
) {
  if (!raw) return raw;

  let working = raw;
  const { out: protectedText, slots } = protect(working);
  let out = unmask(protectedText, opts?.maskLookup);
  out = localizeDigits(out, lang);
  out = restore(out, slots);

  const { out: tableGuarded, slots: tableSlots } = protectTableBlocks(out);
  out = tableGuarded;
  out = stripHeadingParens(out);
  out = rewriteHeadings(out, lang);
  out = restoreTableBlocks(out, tableSlots);

  if (opts?.forbidEnglishHeadings && lang !== 'en') {
    const englishMap = HEADING_MAP.en ?? {};
    const targetMap = HEADING_MAP[lang] ?? {};
    const englishLookup = new Map<string, string>();
    Object.entries(englishMap).forEach(([key, value]) => {
      if (typeof value === 'string') {
        englishLookup.set(value.toLowerCase(), key);
      }
    });

    const localizeHeading = (title: string): string | null => {
      const trimmed = title.trim();
      if (!trimmed) return null;
      const lower = trimmed.toLowerCase();
      const canonical = englishLookup.get(lower) ?? normalizeHeadingKey(trimmed);
      const englishLabel = typeof englishMap[canonical] === 'string' ? englishMap[canonical] as string : undefined;
      if (englishLabel && englishLabel.toLowerCase() === lower) {
        const localized = targetMap[canonical];
        return typeof localized === 'string' ? localized : '';
      }
      return null;
    };

    out = out.replace(/^(#{1,4}\s*)([^\n]+)$/gm, (match, hashes, title) => {
      const localized = localizeHeading(String(title));
      if (localized === null) return match;
      if (localized === '') return '';
      return `${hashes}${localized}`;
    });

    out = out.replace(/^(\*\*)([^*]+)(\*\*)\s*$/gm, (match, open, title, close) => {
      const localized = localizeHeading(String(title));
      if (localized === null) return match;
      if (localized === '') return '';
      return `${open}${localized}${close}`;
    });
  }

  return out;
}

export type EnforceLocaleOptions = Parameters<typeof enforceLocale>[2];

type LocaleStreamOptions = {
  lang: string;
  maskLookup?: Record<string, string>;
  forbidEnglishHeadings?: boolean;
  formatFinalizer?: (fullText: string) => string;
};

export function createLocaleEnforcedStream(
  upstream: ReadableStream<Uint8Array>,
  opts: LocaleStreamOptions,
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';
  let carry = '';

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = upstream.getReader();

      const push = (value: string | Uint8Array) => {
        if (typeof value === 'string') {
          controller.enqueue(encoder.encode(value));
        } else {
          controller.enqueue(value);
        }
      };

      const readNext = (): any =>
        reader.read().then(({ done, value }) => {
          if (done) {
            if (opts.formatFinalizer) {
              try {
                const finalized = opts.formatFinalizer(buffer || '');
                if (typeof finalized === 'string' && finalized.length > 0) {
                  push(`data: ${JSON.stringify({ role: 'assistant', content: finalized })}\n\n`);
                }
              } catch {
                // ignore finalizer errors
              }
            }
            push('data: [DONE]\n\n');
            controller.close();
            return;
          }

          if (value) {
            push(value);
            const chunk = decoder.decode(value, { stream: true });
            carry += chunk;

            let sepIndex = carry.indexOf('\n\n');
            while (sepIndex !== -1) {
              const frame = carry.slice(0, sepIndex);
              carry = carry.slice(sepIndex + 2);

              for (const line of frame.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;
                const payload = trimmed.slice(5).trim();
                if (!payload || payload === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(payload);
                  if (parsed && typeof parsed === 'object') {
                    if (parsed.role === 'assistant' && typeof parsed.content === 'string') {
                      buffer += parsed.content;
                    }
                    const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
                    for (const choice of choices) {
                      const delta = choice?.delta;
                      if (delta && typeof delta.content === 'string') {
                        buffer += delta.content;
                      }
                    }
                  }
                } catch {
                  // swallow parse issues
                }
              }

              sepIndex = carry.indexOf('\n\n');
            }
          }

          return readNext();
        });

      readNext();
    },
  });
}
