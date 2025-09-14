'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAidocStore } from '@/stores/useAidocStore';

export default function AiDocPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetForThread = useAidocStore(s => s.resetForThread);

  function newAidocThread() {
    const id = `aidoc_${Date.now().toString(36)}`;
    router.push(`?panel=ai-doc&threadId=${id}&context=profile`);
    return id;
  }

  const threadId = useMemo(() => searchParams.get('threadId') ?? newAidocThread(), [searchParams]);

  useEffect(() => {
    resetForThread(threadId);
    fetch('/api/aidoc/message', { method: 'POST', body: JSON.stringify({ threadId, op: 'boot' }) });
  }, [threadId, resetForThread]);

  return <div className="p-4">AI Doc</div>;
}
