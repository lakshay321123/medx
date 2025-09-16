'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAidocStore } from '@/stores/useAidocStore';

export default function AiDocPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetForThread = useAidocStore(s => s.resetForThread);

  const threadId = searchParams.get('threadId');
  const intent = searchParams.get('intent');
  const patientId = searchParams.get('patientId');

  const extraQuery = () => {
    const q = new URLSearchParams();
    if (intent) q.set('intent', intent);
    if (patientId) q.set('patientId', patientId);
    const tail = q.toString();
    return tail ? `&${tail}` : '';
  };

  // When opening AiDocPane, reuse existing threadId if present
  useEffect(() => {
    if (!threadId) {
      const saved = sessionStorage.getItem('aidoc_thread');
      const suffix = extraQuery();
      if (saved) {
        router.push(`?panel=ai-doc&threadId=${saved}&context=profile${suffix}`);
      } else {
        const id = `aidoc_${Date.now().toString(36)}`;
        sessionStorage.setItem('aidoc_thread', id);
        router.push(`?panel=ai-doc&threadId=${id}&context=profile${suffix}`);
      }
    }
  }, [threadId, router, intent, patientId]);

  useEffect(() => {
    if (!threadId) return;
    resetForThread(threadId);
    if (sessionStorage.getItem('aidoc_booted')) return;
    sessionStorage.setItem('aidoc_booted', '1');
    fetch('/api/aidoc/message', { method: 'POST', body: JSON.stringify({ threadId, op: 'boot' }) });
  }, [threadId, resetForThread]);

  return (
    <div className="space-y-3 p-4">
      {intent === 'predict' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Analyzing… prediction requested
        </div>
      )}
      <div>AI Doc</div>
    </div>
  );
}
