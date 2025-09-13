"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAidocStore } from "@/stores/useAidocStore";

export default function AiDocPane() {
  const params = useSearchParams();
  const router = useRouter();
  const resetForThread = useAidocStore((s) => s.resetForThread);
  const threadId = params.get("threadId") ?? undefined;

  useEffect(() => {
    if (!threadId) {
      const newTid = `aidoc_${Date.now().toString(36)}`;
      const search = new URLSearchParams(Array.from(params.entries()));
      search.set("threadId", newTid);
      router.replace(`/?panel=ai-doc&${search.toString()}`);
      return;
    }
    resetForThread(threadId);
    fetch("/api/aidoc/message", {
      method: "POST",
      body: JSON.stringify({ threadId, op: "boot" }),
    });
  }, [threadId, params, router, resetForThread]);

  if (!threadId) {
    return (
      <div className="p-6 text-sm text-neutral-500">Preparing AI Doc case…</div>
    );
  }

  return <div className="p-4">AI Doc</div>;
}
