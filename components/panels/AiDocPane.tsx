'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAidocStore } from '@/stores/useAidocStore';

export default function AiDocPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetForThread = useAidocStore(s => s.resetForThread);

  const threadId = searchParams.get('threadId');

  // When opening AiDocPane, reuse existing threadId if present
  useEffect(() => {
    if (!threadId) {
      const saved = sessionStorage.getItem("aidoc_thread");
      if (saved) {
        router.push(`?panel=ai-doc&threadId=${saved}&context=profile`);
      } else {
        const id = `aidoc_${Date.now().toString(36)}`;
        sessionStorage.setItem("aidoc_thread", id);
        router.push(`?panel=ai-doc&threadId=${id}&context=profile`);
      }
    }
  }, [threadId, router]);

  useEffect(() => {
    if (!threadId) return;
    resetForThread(threadId);
    if (sessionStorage.getItem("aidoc_booted")) return;
    sessionStorage.setItem("aidoc_booted", "1");
    fetch("/api/aidoc/message", { method: "POST", body: JSON.stringify({ threadId, op: "boot" }) });
  }, [threadId, resetForThread]);

  return <div className="p-4">AI Doc</div>;
}
