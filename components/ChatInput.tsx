'use client';
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { useOpenPass } from "@/hooks/useOpenPass";

type ChatInputProps = {
  onSend: (text: string, locationToken?: string, files?: File[], messageId?: string) => Promise<void>;
};

type Preview = {
  id: string;
  file: File;
  url: string;
};

const MAX_TEXTAREA_HEIGHT = 168; // ~6 lines

export function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const startNewThread = useChatStore(s => s.startNewThread);
  const currentId = useChatStore(s => s.currentId);
  const addMessage = useChatStore(s => s.addMessage);
  const openPass = useOpenPass();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewList = Array.isArray(previews) ? previews : [];
  const previewsLength = previewList.length;

  // auto-create a new thread when the user starts typing in a fresh session
  useEffect(() => {
    if (!currentId && (text.trim().length > 0 || previewsLength > 0)) {
      startNewThread();
    }
  }, [text, previewsLength, currentId, startNewThread]);

  useEffect(() => {
    const list = Array.isArray(previews) ? previews : [];
    return () => {
      list.forEach(p => {
        if (p?.url) {
          URL.revokeObjectURL(p.url);
        }
      });
    };
  }, [previews]);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
    el.style.height = `${next}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [text]);

  const handleFilesSelected = (files: File[]) => {
    if (!Array.isArray(files) || files.length === 0) return;
    const next = files.map(file => ({
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews(prev => [...(Array.isArray(prev) ? prev : []), ...next]);
  };

  const removePreview = (id: string) => {
    setPreviews(prev => {
      const list = Array.isArray(prev) ? prev : [];
      const target = list.find(p => p.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return list.filter(p => p.id !== id);
    });
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content && previewsLength === 0) return;
    // ensure a thread exists
    if (!currentId) startNewThread();
    // add user message locally (this also sets the title from first words)
    const messageId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    addMessage({ id: messageId, role: "user", content });

    const files = previewList.map(p => p.file);
    const urlsToFlush = previewList.map(p => p.url);
    setText("");
    setPreviews([]);

    let locationToken: string | undefined;
    if (/near me/i.test(content) && typeof openPass?.getLocationToken === 'function') {
      try {
        locationToken = (await openPass.getLocationToken()) || undefined;
      } catch (error) {
        console.error('Failed to acquire location token', error);
      }
    }

    try {
      await onSend(content, locationToken, files, messageId); // existing streaming/send logic
    } catch (error) {
      console.error('ChatInput send error', error);
    } finally {
      urlsToFlush.forEach(url => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    }
  };

  return (
    <>
      {previewsLength > 0 && (
        <div className="fixed bottom-[76px] left-0 right-0 z-30 md:hidden">
          <div className="mx-auto max-w-screen-md px-3">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {previewList.map(preview => (
                <div
                  key={preview.id}
                  className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm dark:border-[#1E3A5F] dark:bg-[#0F1B2D] dark:text-[#E6EDF7]"
                >
                  {preview.file.type.startsWith("image/") ? (
                    <img
                      src={preview.url}
                      alt={preview.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-medium">
                      {preview.file.name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePreview(preview.id)}
                    className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0F172A]/80 text-white dark:bg-white/30"
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur md:static md:bg-transparent md:backdrop-blur-none dark:bg-[#0F1B2D]/95">
        <div className="mx-auto max-w-screen-md px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 md:max-w-none md:px-0 md:pb-0 md:pt-0">
          <div className="flex items-end gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2 shadow-sm transition md:border-[#E2E8F0] md:bg-white dark:border-[#1E3A5F] dark:bg-[#0F1B2D]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-transparent bg-[#F1F5F9] text-[#0F172A] transition hover:border-[#2563EB] hover:text-[#2563EB] dark:bg-[#13233D] dark:text-[#E6EDF7] dark:hover:border-[#3B82F6] dark:hover:text-[#3B82F6]"
              aria-label="Upload file"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V17a3.5 3.5 0 1 1-7 0V6.5a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 1 1-3 0V7" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={event => {
                const files = Array.from(event.target.files ?? []);
                handleFilesSelected(files);
                if (event.currentTarget) event.currentTarget.value = "";
              }}
            />

            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={event => {
                  setText(event.target.value);
                  adjustTextareaHeight();
                }}
                placeholder="Type a message…"
                className="max-h-[168px] w-full resize-none bg-transparent px-1 text-[15px] leading-[1.6] text-[#0F172A] placeholder:text-[#94A3B8] outline-none md:text-base dark:text-[#E6EDF7] dark:placeholder:text-[#64748B]"
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!text.trim() && previewsLength === 0}
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-40 dark:bg-[#3B82F6] dark:hover:bg-[#2563EB]"
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-4 7 4 7-14-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

