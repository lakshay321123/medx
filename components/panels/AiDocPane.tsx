'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAidocStore } from '@/stores/useAidocStore';

export default function AiDocPane({ threadId: propThreadId }: { threadId?: string }) {
  const router = useRouter();
  const resetForThread = useAidocStore(s => s.resetForThread);

  function newAidocThread() {
    const id = `aidoc_${Date.now().toString(36)}`;
    router.push(`?panel=ai-doc&threadId=${id}&context=profile`);
    return id;
  }

  const threadId = useMemo(() => propThreadId ?? newAidocThread(), [propThreadId]);

  useEffect(() => {
    resetForThread(threadId);
    fetch('/api/aidoc/message', { method: 'POST', body: JSON.stringify({ threadId, op: 'boot' }) });
  }, [threadId, resetForThread]);

  return <div className="p-4">AI Doc</div>;
}
