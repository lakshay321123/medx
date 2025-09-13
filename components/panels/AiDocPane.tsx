"use client";
import { useEffect } from "react";
import { useAidocStore } from "@/stores/useAidocStore";

export default function AiDocPane({ threadId }: { threadId?: string }) {
  const resetForThread = useAidocStore((s) => s.resetForThread);

  if (!threadId) {
    const tid = typeof window !== "undefined"
      ? (sessionStorage.getItem("aidoc_thread") || `aidoc_${Date.now().toString(36)}`)
      : undefined;
    if (tid && typeof window !== "undefined") {
      sessionStorage.setItem("aidoc_thread", tid);
      const url = new URL(window.location.href);
      url.searchParams.set("threadId", tid);
      url.searchParams.set("context", url.searchParams.get("context") ?? "profile");
      window.history.replaceState(null, "", url.toString());
    }
    return null;
  }

  useEffect(() => {
    resetForThread(threadId);
    fetch("/api/aidoc/message", {
      method: "POST",
      body: JSON.stringify({ threadId, op: "boot" }),
    });
  }, [threadId, resetForThread]);

  return <div className="p-4">AI Doc</div>;
}
