"use client";

import { useChatState } from "@/context/ChatStateProvider";
import { FormEvent } from "react";

export default function Chat({ inputRef }: { inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement> }) {
  const { messages, draft, setDraft, addMessage } = useChatState();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    addMessage({ role: "user", content: text });
    setDraft("");

    // Call your existing chat API here, then:
    // addMessage({ role: "assistant", content: replyText });
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className="inline-block rounded-lg px-3 py-2 bg-muted">{m.content}</div>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="border-t p-3 flex gap-2">
        <input
          ref={inputRef as any}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 border rounded px-3 py-2"
        />
        <button className="px-4 py-2 rounded bg-black text-white">Send</button>
      </form>
    </div>
  );
}
