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
  const blockedMd = /^(#{1,4}\s*)(What it is|Types|Overview)\s*$/gim;
  const blockedBold = /^(\*\*)(What it is|Types|Overview)(\*\*)\s*$/gim;

  const { out: tableGuarded, slots: tableSlots } = protectTableBlocks(working);
  let out = tableGuarded;

  const { out: protectedText, slots } = protect(out);
  out = unmask(protectedText, opts?.maskLookup);
  out = localizeDigits(out, lang);
  out = restore(out, slots);
  out = stripHeadingParens(out);
  out = rewriteHeadings(out, lang);
  out = restoreTableBlocks(out, tableSlots);

  if (opts?.forbidEnglishHeadings && lang !== 'en') {
    out = out.replace(blockedMd, (_match, hashes, title) => {
      const key = normalizeHeadingKey(String(title));
      const tr = HEADING_MAP[lang]?.[key];
      return tr ? `${hashes}${tr}` : '';
    });
    out = out.replace(blockedBold, (_match, open, title, close) => {
      const key = normalizeHeadingKey(String(title));
      const tr = HEADING_MAP[lang]?.[key];
      return tr ? `${open}${tr}${close}` : '';
    });
  }

  return out;
}

export type EnforceLocaleOptions = Parameters<typeof enforceLocale>[2];

type LocaleStreamOptions = {
  maskLookup?: Record<string, string>;
  forbidEnglishHeadings?: boolean;
  finalizer?: (text: string) => string;
};

export function createLocaleEnforcedStream(
  source: ReadableStream<Uint8Array>,
  lang: string,
  opts?: LocaleStreamOptions,
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const maskLookup = opts?.maskLookup;
  const forbidEnglishHeadings = opts?.forbidEnglishHeadings;
  const finalizer = opts?.finalizer;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = source.getReader();
      let buffer = '';
      let aggregated = '';
      let sanitizedSoFar = '';
      let lastParsed: any = null;

      const sendLine = (line: string) => {
        controller.enqueue(encoder.encode(`${line}\n\n`));
      };

      const sendPayload = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let sentDone = false;

      const emitFinalIfNeeded = () => {
        if (!finalizer) return;
        const revised = finalizer(aggregated);
        if (typeof revised === 'string') {
          aggregated = revised;
        }
        const finalSanitized = enforceLocale(aggregated, lang, { maskLookup, forbidEnglishHeadings });
        if (finalSanitized === sanitizedSoFar) return;
        sanitizedSoFar = finalSanitized;
        const base = lastParsed && typeof lastParsed === 'object'
          ? lastParsed
          : { choices: [{ delta: {} }] };
        const payload = {
          ...base,
          choices: Array.isArray(base?.choices)
            ? base.choices.map((choice: any, index: number) => {
                if (index !== 0) return choice;
                return {
                  ...choice,
                  delta: {
                    ...(choice?.delta || {}),
                    content: finalSanitized,
                    medx_reset: true,
                  },
                };
              })
            : [{ delta: { content: finalSanitized, medx_reset: true } }],
        };
        sendPayload(payload);
      };

      const processEvent = (event: string) => {
        if (!event.startsWith('data:')) {
          sendLine(event);
          return;
        }
        const body = event.slice(5).trim();
        if (!body) return;
        if (body === '[DONE]') {
          sentDone = true;
          emitFinalIfNeeded();
          sendLine('data: [DONE]');
          return;
        }
        let parsed: any;
        try {
          parsed = JSON.parse(body);
        } catch {
          sendLine(`data: ${body}`);
          return;
        }
        lastParsed = parsed;
        const choices = Array.isArray(parsed?.choices) ? parsed.choices : [];
        const primary = choices[0];
        const delta = primary?.delta;
        if (delta && typeof delta.content === 'string' && delta.content.length > 0) {
          aggregated += delta.content;
          const sanitized = enforceLocale(aggregated, lang, { maskLookup, forbidEnglishHeadings });
          let payload: any;
          if (!sanitized.startsWith(sanitizedSoFar)) {
            sanitizedSoFar = sanitized;
            payload = {
              ...parsed,
              choices: choices.map((choice: any, index: number) => {
                if (index !== 0) return choice;
                return {
                  ...choice,
                  delta: {
                    ...choice.delta,
                    content: sanitized,
                    medx_reset: true,
                  },
                };
              }),
            };
            sendPayload(payload);
            return;
          }
          const addition = sanitized.slice(sanitizedSoFar.length);
          sanitizedSoFar = sanitized;
          if (!addition) return;
          payload = {
            ...parsed,
            choices: choices.map((choice: any, index: number) => {
              if (index !== 0) return choice;
              return {
                ...choice,
                delta: {
                  ...choice.delta,
                  content: addition,
                },
              };
            }),
          };
          sendPayload(payload);
          return;
        }
        sendPayload(parsed);
      };

      const flush = () => {
        let idx = buffer.indexOf('\n\n');
        while (idx >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (chunk.length > 0) processEvent(chunk);
          idx = buffer.indexOf('\n\n');
        }
      };

      const pump = () => reader.read().then(({ done, value }) => {
        if (done) {
          flush();
          emitFinalIfNeeded();
          if (!sentDone) {
            sentDone = true;
            sendLine('data: [DONE]');
          }
          controller.close();
          return;
        }
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          flush();
        }
        return pump();
      }).catch((err) => {
        controller.error(err);
      });

      pump();
    },
  });
}
