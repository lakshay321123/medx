"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAidocStore } from "@/stores/useAidocStore";

export default function AiDocPane({ threadId }: { threadId?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const resetForThread = useAidocStore((s) => s.resetForThread);

  useEffect(() => {
    if (threadId) return;
    // Try session thread first
    const sess = typeof window !== "undefined" ? sessionStorage.getItem("aidoc_thread") : null;
    const tid = sess && sess.trim() ? sess : `aidoc_${Date.now().toString(36)}`;
    try { sessionStorage.setItem("aidoc_thread", tid); } catch {}
    const ctx = params.get("context") ?? "profile";
    router.replace(`/?panel=ai-doc&threadId=${tid}&context=${ctx}`);
  }, [threadId, params, router]);

  useEffect(() => {
    if (!threadId) return;
    resetForThread(threadId);
    fetch("/api/aidoc/message", {
      method: "POST",
      body: JSON.stringify({ threadId, op: "boot" }),
    });
  }, [threadId, resetForThread]);

  if (!threadId) return null; // brief blank during replace

  return <div className="p-4">AI Doc</div>;
}
