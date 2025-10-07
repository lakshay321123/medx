import { enforceLocale } from '@/lib/i18n/enforce';

export type ProxyOptions = {
  lang: string;
  maskLookup?: Record<string, string>;
  forbidEnglishHeadings?: boolean;
  formatFinalizer?: (fullText: string) => string | undefined;
  emitResetDelta?: boolean;
};

export function proxySseWithFinalizer(
  upstream: ReadableStream<Uint8Array>,
  opts: ProxyOptions,
) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const applyLocale = (text: string) =>
    enforceLocale(text, opts.lang, {
      maskLookup: opts.maskLookup,
      forbidEnglishHeadings: opts.forbidEnglishHeadings,
    });

  let carry = '';
  let buffer = '';

  const emit = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    value: string,
  ) => controller.enqueue(enc.encode(value));

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = upstream.getReader();

      const pump = (): any =>
        reader.read().then(({ done, value }) => {
          if (done) {
            if (opts.formatFinalizer) {
              try {
                const finalized = opts.formatFinalizer(buffer || '');
                if (typeof finalized === 'string' && finalized.length > 0) {
                  const localizedFinal = applyLocale(finalized);
                  const useReset = opts.emitResetDelta !== false;
                  const payload = useReset
                    ? { choices: [{ delta: { content: localizedFinal, medx_reset: true } }] }
                    : { choices: [{ delta: { content: localizedFinal } }] };
                  emit(controller, `data: ${JSON.stringify(payload)}\n\n`);
                }
              } catch {
                // swallow finalizer errors to keep stream alive
              }
            }
            emit(controller, 'data: [DONE]\n\n');
            controller.close();
            return;
          }

          if (value) {
            const chunk = dec.decode(value, { stream: true });
            carry += chunk;

            let sep = carry.indexOf('\n\n');
            while (sep !== -1) {
              const frame = carry.slice(0, sep);
              carry = carry.slice(sep + 2);

              const rebuilt: string[] = [];
              for (const line of frame.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) {
                  rebuilt.push(line);
                  continue;
                }

                const raw = trimmed.slice(5).trim();
                if (!raw || raw === '[DONE]') {
                  continue;
                }

                let parsed: any;
                try {
                  parsed = JSON.parse(raw);
                } catch {
                  rebuilt.push(line);
                  continue;
                }

                if (parsed?.role === 'assistant' && typeof parsed.content === 'string') {
                  parsed.content = applyLocale(parsed.content);
                  buffer += parsed.content;
                }

                const choices = Array.isArray(parsed?.choices) ? parsed.choices : [];
                for (const choice of choices) {
                  const delta = choice?.delta;
                  if (delta && typeof delta.content === 'string') {
                    delta.content = applyLocale(delta.content);
                    buffer += delta.content;
                  }
                }

                rebuilt.push(`data: ${JSON.stringify(parsed)}`);
              }

              if (rebuilt.length) {
                emit(controller, `${rebuilt.join('\n')}\n\n`);
              }

              sep = carry.indexOf('\n\n');
            }
          }

          return pump();
        });

      pump();
    },
  });
}
