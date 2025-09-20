export type ChatProvider = 'openai' | 'groq' | 'none';

export function pickProvider(opts: { panel: string; intent?: string }): ChatProvider {
  const panel = (opts.panel || '').toLowerCase();
  if (panel === 'ai-doc' || panel === 'med-profile') {
    return 'openai';
  }

  const intent = (opts.intent || '').toLowerCase();
  if (intent === 'basic' || intent === 'casual') {
    return 'groq';
  }

  const env = (process.env.NEXT_PUBLIC_CHAT_PROVIDER as ChatProvider | undefined) || 'openai';
  if (env === 'groq' || env === 'none') return env;
  return 'openai';
}
