"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AiDocPane({ threadId }: { threadId?: string }) {
  const router = useRouter();

  // Auto-create or reuse a session case if user arrived via top button without a threadId
  useEffect(() => {
    if (threadId) return;
    const sess = typeof window !== "undefined" ? sessionStorage.getItem("aidoc_thread") : null;
    const tid = sess && sess.trim() ? sess : `aidoc_${Date.now().toString(36)}`;
    try { sessionStorage.setItem("aidoc_thread", tid); } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set("threadId", tid);
    url.searchParams.set("context", url.searchParams.get("context") ?? "profile");
    router.replace(url.toString());
  }, [threadId, router]);

  if (!threadId) return null; // brief until replace

  // TODO: fetch and render thread messages by threadId
  return (
    <div className="p-6">
      <h2 className="mb-2 text-lg font-semibold">AI Doc</h2>
      {/* Messages UI here */}
    </div>
  );
}
