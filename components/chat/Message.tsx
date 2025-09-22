"use client";

import Image from "next/image";
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

  const hasText = typeof m.content === "string" && m.content.trim().length > 0;

  return (
    <div className={`my-3 ${m.role === "user" ? "text-right" : "text-left"}`}>
      {hasText && (
        <div className="inline-block rounded-xl bg-gray-100 px-3 py-2 text-sm">
          {m.content}
        </div>
      )}
      {!!m.attachments?.length && (
        <div
          className={`mt-2 flex flex-wrap gap-3 ${
            m.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {m.attachments.map(att =>
            att.kind === "image" ? (
              <button
                key={att.id}
                type="button"
                className="relative h-28 w-28 overflow-hidden rounded-xl border"
                onClick={() => setViewer(att)}
                aria-label={`Open ${att.name}`}
                title={att.name}
              >
                <Image
                  src={att.url}
                  alt={att.name}
                  fill
                  sizes="112px"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </button>
            ) : (
              <span
                key={att.id}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm"
                title={att.name}
              >
                <span className="i-lucide-paperclip" aria-hidden />
                <span className="truncate max-w-[10rem]" title={att.name}>
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
          role="dialog"
          aria-modal
          onClick={() => setViewer(null)}
        >
          <button
            type="button"
            className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl"
            onClick={event => event.stopPropagation()}
          >
            <Image
              src={viewer.url}
              alt={viewer.name}
              width={viewer.width ?? 1200}
              height={viewer.height ?? 1200}
              className="h-full w-full object-contain"
              unoptimized
            />
          </button>
        </div>
      )}
    </div>
  );
}
