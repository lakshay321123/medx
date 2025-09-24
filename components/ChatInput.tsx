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

  // auto-create a new thread when the user starts typing in a fresh session
  useEffect(() => {
    if (!currentId && (text.trim().length > 0 || previews.length > 0)) {
      startNewThread();
    }
  }, [text, previews.length, currentId, startNewThread]);

  useEffect(() => {
    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url));
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
    if (!files.length) return;
    const next = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews(prev => [...prev, ...next]);
  };

  const removePreview = (id: string) => {
    setPreviews(prev => {
      const target = prev.find(p => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter(p => p.id !== id);
    });
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content && previews.length === 0) return;
    // ensure a thread exists
    if (!currentId) startNewThread();
    // add user message locally (this also sets the title from first words)
    const messageId = crypto.randomUUID();
    addMessage({ id: messageId, role: "user", content });

    const files = previews.map(p => p.file);
    const urlsToFlush = previews.map(p => p.url);
    setText("");
    setPreviews([]);

    let locationToken: string | undefined;
    if (/near me/i.test(content)) {
      locationToken = await openPass.getLocationToken() || undefined;
    }

    await onSend(content, locationToken, files, messageId); // existing streaming/send logic

    urlsToFlush.forEach(url => URL.revokeObjectURL(url));
  };

  return (
    <>
      {previews.length > 0 && (
        <div className="fixed bottom-[76px] left-0 right-0 z-30 md:hidden">
          <div className="mx-auto max-w-screen-md px-3">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {previews.map(preview => (
                <div
                  key={preview.id}
                  className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
                >
                  {preview.file.type.startsWith("image/") ? (
                    <img
                      src={preview.url}
                      alt={preview.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-slate-200">
                      {preview.file.name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePreview(preview.id)}
                    className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
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

      <div className="fixed inset-x-0 bottom-0 z-30 bg-slate-950/90 backdrop-blur md:static md:bg-transparent md:backdrop-blur-none">
        <div className="mx-auto max-w-screen-md px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 md:max-w-none md:px-0 md:pb-0 md:pt-0">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 md:border-slate-200/60 md:bg-white/90 md:shadow-sm">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800/80 text-slate-200 transition hover:bg-slate-800"
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
                className="max-h-[168px] w-full resize-none bg-transparent px-1 text-sm leading-6 text-white placeholder:text-slate-400 outline-none md:text-slate-900"
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
              disabled={!text.trim() && previews.length === 0}
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-40"
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

