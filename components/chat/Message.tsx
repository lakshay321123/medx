"use client";

import { useEffect, useState } from "react";

import type { ChatAttachment, ChatMessage } from "@/types/chat";

export default function Message({ m }: { m: ChatMessage }) {
  const [viewer, setViewer] = useState<ChatAttachment | null>(null);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewer(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  const bubbleText =
    typeof m.text === "string" && m.text.length > 0
      ? m.text
      : typeof m.content === "string"
      ? m.content
      : "";
  const hasText = bubbleText.trim().length > 0;

  return (
    <div className={`my-3 ${m.role === "user" ? "text-right" : "text-left"}`}>
      {hasText && (
        <div className="inline-block rounded-xl bg-gray-100 px-3 py-2">
          {bubbleText}
        </div>
      )}

      {!!m.attachments?.length && (
        <div
          className={`mt-2 flex flex-wrap gap-8 ${
            m.role === "user" ? "justify-end" : ""
          }`}
        >
          {m.attachments.map(att =>
            att.kind === "image" ? (
              <button
                key={att.id}
                type="button"
                className="h-28 w-28 overflow-hidden rounded-xl border"
                onClick={() => setViewer(att)}
                title={att.name}
              >
                <img
                  src={att.url}
                  alt={att.name}
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <span
                key={att.id}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm"
                title={att.name}
              >
                <span className="i-lucide-paperclip" aria-hidden />
                <span className="max-w-[10rem] truncate" title={att.name}>
                  {att.name}
                </span>
                <span className="text-gray-500">({att.mime || "file"})</span>
              </span>
            ),
          )}
        </div>
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewer(null)}
        >
          <img
            src={viewer.url}
            alt={viewer.name}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
