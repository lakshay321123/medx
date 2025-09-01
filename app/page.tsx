'use client';

import React, { useState, useRef, useEffect } from 'react';
import Markdown from '@/components/Markdown';
import NearbyCards from '@/components/NearbyCards';

export default function Page() {
  const [messages, setMessages] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Example: send a message
  async function sendMessage() {
    const text = inputRef.current?.value.trim();
    if (!text) return;
    const userMsg = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);

    inputRef.current!.value = '';

    // 🔹 Example: detect "near me" intent
    if (/near me/i.test(text)) {
      setMessages((m) => [
        ...m,
        { type: 'nearby-cards', payload: text }
      ]);
      return;
    }

    // 🔹 Otherwise fallback to normal response
    setMessages((m) => [
      ...m,
      { role: 'assistant', content: `You said: ${text}` }
    ]);
  }

  function renderMessage(m: any, idx: number) {
    // Nearby search cards
    if (m.type === 'nearby-cards') {
      const q =
        typeof m.payload === 'string' && m.payload.trim()
          ? m.payload.trim()
          : 'docs near me';
      return (
        <div key={idx} className="content">
          <NearbyCards query={q} />
        </div>
      );
    }

    // Markdown messages (assistant / user)
    return (
      <div key={idx} className="content markdown">
        <Markdown text={m.content || ''} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="messages">
        {messages.map((m, idx) => renderMessage(m, idx))}
      </div>

      <div className="inputBox">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type your query…"
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>→</button>
      </div>
    </div>
  );
}
