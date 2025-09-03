"use client";
import { useEffect } from "react";
import { useUI } from "@/lib/store/ui";

export default function ChatPane({ threadId }: { threadId: string }) {
  const { activeThreadId, setActiveThread, threads, addMessage, setTopic, hydrate } = useUI();
  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { setActiveThread(threadId); }, [threadId, setActiveThread]);

  const t = (threadId && threads[threadId]) || { messages: [], topic: "" };

  // example send
  async function onSend(text: string) {
    const msg = { id: crypto.randomUUID(), role: "user" as const, content: text, ts: Date.now() };
    addMessage(threadId, msg);
    // call your existing /api/diag (or LLM endpoint) then add assistant reply via addMessage(...)
  }

  return (
    <div className="h-full flex flex-col">
      {t.topic && <div className="mx-auto my-2 text-sm opacity-70">Topic: {t.topic}</div>}
      {/* render t.messages */}
      {/* input box -> onSend */}
    </div>
  );
}
