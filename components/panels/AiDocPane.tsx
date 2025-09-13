"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAidocStore } from "@/stores/useAidocStore";

export default function AiDocPane({ threadId }: { threadId?: string }) {
  const router = useRouter();
  const resetForThread = useAidocStore(s => s.resetForThread);

  function newAidocThread() {
    const id = `aidoc_${Date.now().toString(36)}`;
    router.push(`?panel=ai-doc&threadId=${id}&context=profile`);
    return id;
  }

  const tid = useMemo(() => threadId ?? newAidocThread(), [threadId]);

  useEffect(() => {
    resetForThread(tid);
    const KEY = "aidoc_booted";
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    fetch("/api/aidoc/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "boot" }),
    });
  }, [tid, resetForThread]);

  return <div className="p-4">AI Doc</div>;
}
