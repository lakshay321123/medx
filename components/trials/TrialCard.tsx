'use client';

import { useState } from 'react';
import { Clipboard, ExternalLink, Check } from 'lucide-react';
import ChatMarkdown from '@/components/ChatMarkdown';

type TrialCardProps = {
  nctId: string;
  title?: string | null;
  status?: string | null;
  phase?: string | null;
  url?: string | null;
  markdown?: string;
  pending?: boolean;
  error?: string | null;
};

export default function TrialCard({
  nctId,
  title,
  status,
  phase,
  url,
  markdown,
  pending,
  error,
}: TrialCardProps) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'error'>('idle');

  if (pending) {
    return (
      <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  const handleCopy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied('copied');
      setTimeout(() => setCopied('idle'), 2000);
    } catch (err) {
      console.error('copy_failed', err);
      setCopied('error');
      setTimeout(() => setCopied('idle'), 2000);
    }
  };

  return (
    <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold tracking-tight">{nctId}</h3>
        {status && (
          <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 px-2 py-0.5 text-xs">
            {status}
          </span>
        )}
        {phase && (
          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 text-xs">
            {phase}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs">
          {markdown && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {copied === 'copied' ? <Check size={14} /> : <Clipboard size={14} />}
              {copied === 'copied' ? 'Copied' : 'Copy'}
            </button>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ExternalLink size={14} /> Open
            </a>
          )}
        </div>
      </header>
      {title && <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>}
      {error ? (
        <div className="text-sm text-rose-600 dark:text-rose-300">{error}</div>
      ) : (
        markdown && <ChatMarkdown content={markdown} />
      )}
    </div>
  );
}
