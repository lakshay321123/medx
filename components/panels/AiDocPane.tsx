'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAidocStore } from '@/stores/useAidocStore';

export default function AiDocPane({ threadId }: { threadId?: string }) {
  const router = useRouter();
  const resetForThread = useAidocStore(s => s.resetForThread);

  function newAidocThread() {
    const id = `aidoc_${Date.now().toString(36)}`;
    router.push(`?panel=ai-doc&threadId=${id}&context=profile`);
    return id;
  }

  const id = useMemo(() => threadId ?? newAidocThread(), [threadId]);

  useEffect(() => {
    resetForThread(id);
    fetch('/api/aidoc/message', { method: 'POST', body: JSON.stringify({ threadId: id, op: 'boot' }) });
  }, [id, resetForThread]);

  return <div className="p-4">AI Doc</div>;
}
