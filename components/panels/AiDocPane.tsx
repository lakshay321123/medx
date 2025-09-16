'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAidocStore } from '@/stores/useAidocStore';

export default function AiDocPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const resetForThread = useAidocStore(s => s.resetForThread);
  const addMessage = useAidocStore(s => s.addMessage);
  const messages = useAidocStore(s => s.messages);

  const threadId = searchParams.get('threadId');
  const intent = searchParams.get('intent');
  const patientId = searchParams.get('patientId');

  useEffect(() => {
    if (threadId) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(searchParamsString);
    const saved = sessionStorage.getItem('aidoc_thread');
    const id = saved || `aidoc_${Date.now().toString(36)}`;
    if (!saved) sessionStorage.setItem('aidoc_thread', id);
    params.set('panel', 'aidoc');
    params.set('threadId', id);
    if (!params.get('context')) params.set('context', 'profile');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [threadId, router, searchParamsString]);

  useEffect(() => {
    if (!threadId) return;
    resetForThread(threadId);
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('aidoc_booted')) return;
    sessionStorage.setItem('aidoc_booted', '1');
    fetch('/api/aidoc/message', {
      method: 'POST',
      body: JSON.stringify({ threadId, op: 'boot' }),
    }).catch(() => {});
  }, [threadId, resetForThread]);

  useEffect(() => {
    if (!threadId || !intent) return;
    let content: string | null = null;
    if (intent === 'recompute') content = 'Analyzing… (Recompute requested).';
    else if (intent === 'seedProfile') content = 'Profile context loaded.';
    if (!content) return;
    addMessage({ role: 'system', content });
    const params = new URLSearchParams(searchParamsString);
    params.delete('intent');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [intent, threadId, addMessage, router, searchParamsString]);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">AI Doc</h2>
        {patientId && (
          <div className="text-xs text-muted-foreground">Patient ID: {patientId}</div>
        )}
      </div>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
            Awaiting actions.
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              {msg.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
