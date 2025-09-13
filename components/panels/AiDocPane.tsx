"use client";
import { useEffect } from "react";
import { useAidocStore } from "@/stores/useAidocStore";

export default function AiDocPane({ threadId }: { threadId?: string }) {
  const resetForThread = useAidocStore((s) => s.resetForThread);

  useEffect(() => {
    if (!threadId) return;
    resetForThread(threadId);
    fetch("/api/aidoc/message", {
      method: "POST",
      body: JSON.stringify({ threadId, op: "boot" }),
    });
  }, [threadId, resetForThread]);

  if (!threadId) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        No AI Doc case selected yet. Click <strong>AI Doc</strong> in the sidebar to start.
      </div>
    );
  }

  return <div className="p-4">AI Doc</div>;
}
