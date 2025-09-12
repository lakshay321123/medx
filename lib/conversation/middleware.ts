// Types are optional; keep loose if your codebase prefers "any".
type ChatMessage = { role: string; content: string };
type ChatCtx = {
  lastUserMessage?: string;
  messages?: ChatMessage[];
  meta?: Record<string, any>;
  // Optionally, your pipeline can stash previous ctx/computed here
  previous?: { ctx?: any; computed?: any[] };
};

/**
 * Middleware: context retention + acknowledgment detection.
 * - Marks short, affirmative/thank-you/emoji-only messages as "ack-only"
 * - On ack-only: retains prior clinical context; downstream can skip re-extract/re-compute
 * - Sets default verify timeout to 60s for the GPT-5 verification stage
 */
export function withContextRetention<T extends (ctx: ChatCtx) => any>(baseHandler: T) {
  const SINGLE_WORD_ACK = new Set([
    'ok', 'okay', 'k', 'kk', 'yes', 'yep', 'yup', 'sure', 'fine', 'great', 'nice', 'cool', 'alright',
    'thanks', 'thankyou', 'ty', 'thx', 'roger', 'copy', 'copythat', 'affirmative', 'noted', 'done'
  ]);

  const ACK_PHRASES = [
    'got it', 'sounds good', 'makes sense', 'all good', 'looks good', 'thank you', 'many thanks',
    'much appreciated', 'appreciated', 'that helps', 'that works'
  ];

  const ACK_EMOJIS = /[\u{1F44D}\u{1F44C}\u{1F64F}\u{1F642}\u{1F60A}\u{1F60C}\u{2705}]/u; // 👍👌🙏🙂😊😌✅

  const NEGATION_NEARBY = /\b(no|not|don['’]t|doesn['’]t|isn['’]t|but|however|except|although)\b/;
  const HAS_QUESTION = /\?/;
  const HAS_NUMBERY = /[-+]?\d/; // numbers/labs → not ack-only
  const PUNCT_THAT_SUGGESTS_CONTENT = /[:,;=]/; // often present in lab dumps

  function normalize(s?: string) {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function isSingleWordAck(tok: string) {
    return SINGLE_WORD_ACK.has(tok);
  }

  function tokenCount(s: string) {
    return s ? s.split(/\s+/).filter(Boolean).length : 0;
  }

  function isAckMessage(msgRaw?: string): { isAck: boolean; isAckOnly: boolean } {
    const msg = normalize(msgRaw);
    if (!msg) return { isAck: false, isAckOnly: false };

    // Pure emoji acks (👍 etc.)
    if (ACK_EMOJIS.test(msg) && !NEGATION_NEARBY.test(msg)) {
      // If ONLY emojis (no letters/digits/punct), treat as pure ack
      const onlyEmoji = !/[a-z0-9?=:,;]/i.test(msg);
      return { isAck: true, isAckOnly: onlyEmoji };
    }

    const words = msg.split(' ').filter(Boolean);
    const wordCnt = words.length;

    // Quick negatives/questions or “content-like” punctuation → not ack-only
    if (NEGATION_NEARBY.test(msg) || HAS_QUESTION.test(msg) || PUNCT_THAT_SUGGESTS_CONTENT.test(msg) || HAS_NUMBERY.test(msg)) {
      // Might still be an ack (“ok, but…”) → allow addAcknowledgment but NOT ack-only
      const hasAckToken =
        words.some(w => isSingleWordAck(w)) || ACK_PHRASES.some(p => msg.includes(p));
      return { isAck: hasAckToken, isAckOnly: false };
    }

    const hasAckToken =
      words.some(w => isSingleWordAck(w)) || ACK_PHRASES.some(p => msg.includes(p));

    // Very short, positive, no questions/numbers → ack-only
    if (hasAckToken && wordCnt <= 6) {
      return { isAck: true, isAckOnly: true };
    }

    return { isAck: hasAckToken, isAckOnly: false };
  }

  return async (ctx: ChatCtx) => {
    const msgRaw = ctx?.lastUserMessage ?? ctx?.messages?.slice(-1)[0]?.content ?? '';
    const { isAck, isAckOnly } = isAckMessage(msgRaw);

    // Ensure meta bag
    ctx.meta = ctx.meta || {};

    // Always set addAcknowledgment if we detected an ack intent
    if (isAck) {
      ctx.meta.addAcknowledgment = true;
    }

    // On pure acknowledgments, retain previous structured context and
    // let downstream skip heavy work (extract/compute) if your pipeline supports it.
    if (isAckOnly) {
      ctx.meta.isAcknowledgmentOnly = true;
      ctx.meta.retainContext = true;
      ctx.meta.skipReextract = true;  // downstream: keep last extracted ctx
      ctx.meta.skipRecompute = true;  // downstream: keep last computed calculators
    } else {
      // For any non-ack or mixed message, let pipeline run as usual
      ctx.meta.isAcknowledgmentOnly = false;
      ctx.meta.retainContext = false;
      ctx.meta.skipReextract = false;
      ctx.meta.skipRecompute = false;
    }

    // Global verification SLA (OpenAI verifier). Default to 60s if unset.
    if (typeof ctx.meta.verifyTimeoutMs !== 'number') {
      ctx.meta.verifyTimeoutMs = 60_000;
    }

    // Hint the UI about task mode if your stack consumes it:
    // If the message looks like just an ack → "thinking" (no calculators),
    // else let the downstream decide based on detected calculators.
    if (isAckOnly) {
      ctx.meta.taskMode = 'thinking';
    }

    return baseHandler(ctx);
  };
}
