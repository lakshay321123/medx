import { useEffect, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";

export function ChatInput({ onSend }: { onSend: (text: string)=>Promise<void> }) {
  const [text, setText] = useState("");
  const startNewThread = useChatStore(s => s.startNewThread);
  const currentId = useChatStore(s => s.currentId);
  const addMessage = useChatStore(s => s.addMessage);

  // auto-create a new thread when the user starts typing in a fresh session
  useEffect(() => {
    if (!currentId && text.trim().length > 0) {
      startNewThread();
    }
  }, [text, currentId, startNewThread]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    // ensure a thread exists
    if (!currentId) startNewThread();
    // add user message locally (this also sets the title from first words)
    addMessage({ role: "user", content });
    setText("");
    await onSend(content); // your existing streaming/send logic
  };

  return (
    <div className="flex gap-2">
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message…" />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}

