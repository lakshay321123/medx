"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAidocStore } from "@/stores/useAidocStore";

interface Props {
  threadId?: string;
}

export default function AiDocPane({ threadId: initialThreadId }: Props) {
  const router = useRouter();
  const resetForThread = useAidocStore((s) => s.resetForThread);

  const threadId = useMemo(() => {
    if (initialThreadId) return initialThreadId;
    const id = `aidoc_${Date.now().toString(36)}`;
    router.push(`?panel=ai-doc&threadId=${id}&context=profile`);
    return id;
  }, [initialThreadId, router]);

  useEffect(() => {
    resetForThread(threadId);
    fetch('/api/aidoc/message', { method: 'POST', body: JSON.stringify({ threadId, op: 'boot' }) });
  }, [threadId, resetForThread]);

  return <div className="p-4">AI Doc</div>;
}
