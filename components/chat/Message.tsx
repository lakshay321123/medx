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

  const text = m.text ?? m.content;

  return (
    <div className={`my-3 ${m.role === "user" ? "text-right" : "text-left"}`}>
      {text && (
        <div className="inline-block rounded-xl bg-gray-100 px-3 py-2 text-left text-sm">
          {text.split("\n").map((line, idx) => (
            <p key={idx} className={idx > 0 ? "mt-1" : undefined}>
              {line}
            </p>
          ))}
        </div>
      )}
      {!!m.attachments?.length && (
        <div className={`mt-2 flex flex-wrap gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
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
                {/* @ts-ignore allow blob/object URLs */}
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
                {att.name}
                <span className="text-gray-500">({att.mime})</span>
              </span>
            ),
          )}
        </div>
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewer(null)}
        >
          {/* @ts-ignore allow blob/object URLs */}
          <Image
            src={viewer.url}
            alt={viewer.name}
            width={viewer.width ?? 1200}
            height={viewer.height ?? 1200}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            unoptimized
            onClick={event => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
