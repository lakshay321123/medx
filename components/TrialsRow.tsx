import * as React from 'react';
import type { TrialRow } from '@/types/trials';
import { registryIdLabel } from '@/lib/registry';
import { pushAssistantToChat } from '@/lib/chat/pushAssistantToChat';
import { formatTrialBriefMarkdown } from '@/lib/trials/brief';

function useIsDoctor() {
  if (typeof window === 'undefined') return false;
  const mode = new URLSearchParams(window.location.search).get('mode');
  return mode === 'doctor';
}

export function TrialsRow({ row }: { row: TrialRow }) {
  const isDoctor = useIsDoctor();

  const onSummarize = React.useCallback(async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    if (!isDoctor) return;
    e.preventDefault();

    try {
      pushAssistantToChat({ content: '_Summarizing trial…_' });

      const response = await fetch(`/api/trials/${row.id}/summary`, { cache: 'no-store' });
      const raw = await response.text();
      let payload: unknown = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = raw;
        }
      }

      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null && 'error' in (payload as Record<string, unknown>) &&
          typeof (payload as any).error === 'string'
            ? (payload as any).error
            : typeof payload === 'string' && payload
              ? payload
              : `Request failed (${response.status})`;
        throw new Error(message);
      }

      const markdown = formatTrialBriefMarkdown(row.id, payload ?? {});
      pushAssistantToChat({ content: markdown });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? '');
      const detail = message.trim() || 'unknown error';
      pushAssistantToChat({ content: `⚠️ Could not summarize **${row.id}**: ${detail}` });
    }
  }, [isDoctor, row.id]);

  return (
    <tr className="hover:bg-muted/50">
      <td className="border px-2 py-1 whitespace-nowrap align-top">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{registryIdLabel(row.source)}</span>
          <a
            href={row.url || `https://clinicaltrials.gov/study/${row.id}`}
            onClick={onSummarize}
            className={isDoctor ? 'underline decoration-dotted hover:decoration-solid' : 'underline'}
          >
            {row.id}
          </a>
        </div>
      </td>
      <td className="border px-2 py-1 align-top min-w-[24rem]">{row.title}</td>
      <td className="border px-2 py-1 whitespace-nowrap align-top">{row.phase || '—'}</td>
      <td className="border px-2 py-1 whitespace-nowrap align-top">{row.status || '—'}</td>
      <td className="border px-2 py-1 whitespace-nowrap align-top">{row.country || '—'}</td>
    </tr>
  );
}

export default TrialsRow;
