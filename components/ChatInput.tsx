"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { useOpenPass } from "@/hooks/useOpenPass";
import { Plus, SendHorizontal } from "lucide-react";
import { useT } from "@/components/hooks/useI18n";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { useUIStore } from "@/components/hooks/useUIStore";

export type ComposerDropupMeta = {
  intent?: "upload";
  formatDefault?: string;
  research?: number;
  thinkingProfile?: string;
};

type DropupLabel = "upload" | "study" | "thinking" | null;

export function ChatInput({
  onSend,
  canSend,
}: {
  onSend: (
    text: string,
    locationToken?: string,
    lang?: string,
    meta?: ComposerDropupMeta | null,
  ) => Promise<void>;
  canSend: () => boolean;
}) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const currentId = useChatStore(s => s.currentId);
  const addMessage = useChatStore(s => s.addMessage);
  const draft = useChatStore(s => s.draft);
  const setDraftText = useChatStore(s => s.setDraftText);
  const clearDraft = useChatStore(s => s.clearDraft);
  const openPass = useOpenPass();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const t = useT();
  const sendText = t("ui.composer.send");
  const composerPlaceholder = t("ui.composer.placeholder");
  const moreText = t("ui.composer.more");
  const uploadOptionText = t("ui.composer.upload_option");
  const studyOptionText = t("ui.composer.study_option");
  const thinkingOptionText = t("ui.composer.thinking_option");
  const selectedLabelText = t("ui.composer.selected_label");
  const { lang } = usePrefs();
  const openPrefs = useUIStore((state) => state.openPrefs);
  const dropupRef = useRef<HTMLDivElement | null>(null);
  const [activeLabel, setActiveLabel] = useState<DropupLabel>(null);
  const [isDropupOpen, setDropupOpen] = useState(false);

  const labelToMeta = useMemo((): Record<Exclude<DropupLabel, null>, ComposerDropupMeta> => ({
    upload: { intent: "upload" },
    study: { formatDefault: "essay", research: 1 },
    thinking: { thinkingProfile: "balanced" },
  }), []);

  const labelToText = useMemo(
    () => ({
      upload: uploadOptionText,
      study: studyOptionText,
      thinking: thinkingOptionText,
    }),
    [studyOptionText, thinkingOptionText, uploadOptionText],
  );

  const redirectToAccount = useCallback(() => {
    openPrefs("Account");
  }, [openPrefs]);

  const ensureThread = useCallback(() => {
    const state = useChatStore.getState();
    return state.currentId ?? state.startNewThread();
  }, []);

  useEffect(() => {
    if (currentId) {
      setText("");
      return;
    }
    const pendingText = draft.text ?? "";
    setText(pendingText);
  }, [currentId, draft.text]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${next}px`;
  }, [text]);

  useEffect(() => {
    if (!isDropupOpen) return;
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!dropupRef.current) return;
      if (event.target instanceof Node && dropupRef.current.contains(event.target)) {
        return;
      }
      setDropupOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isDropupOpen]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropupOpen(false);
      }
      if (event.key === "Backspace") {
        const activeElement = document.activeElement;
        if (
          activeLabel &&
          textareaRef.current &&
          activeElement === textareaRef.current &&
          text.length === 0
        ) {
          setActiveLabel(null);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [activeLabel, text]);

  const handleSend = async () => {
    if (isSending) return;
    const content = text.trim();
    if (!content) return;
    if (!canSend()) {
      redirectToAccount();
      return;
    }
    setIsSending(true);
    try {
      ensureThread();
      // add user message locally (this also sets the title from first words)
      addMessage({ role: "user", content });
      if (!currentId) {
        clearDraft();
      }
      setText("");

      let locationToken: string | undefined;
      if (/near me/i.test(content)) {
        locationToken = (await openPass.getLocationToken()) || undefined;
      }

      const meta = activeLabel ? labelToMeta[activeLabel] ?? null : null;
      await onSend(content, locationToken, lang, meta); // your existing streaming/send logic
      if (activeLabel) {
        setActiveLabel(null);
      }
      setDropupOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await handleSend();
  };

  const onDropFiles = (files: FileList | null) => {
    if (!files?.length) return;
    // TODO: feed your existing upload pipeline here.
  };

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropFiles(e.dataTransfer.files);
      }}
      className="chat-input-container flex w-full flex-wrap items-end gap-2 rounded-2xl border border-[color:var(--medx-outline)] bg-[color:var(--medx-surface)] px-3 py-2 shadow-sm transition dark:border-white/10 dark:bg-[color:var(--medx-panel)] md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none"
    >
      <div ref={dropupRef} className="relative flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isDropupOpen}
          aria-label={moreText}
          title={moreText}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-[color:var(--medx-text)] transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-[color:var(--medx-text)] dark:hover:bg-white/10"
          onClick={() => {
            setDropupOpen(open => !open);
          }}
        >
          <Plus className="h-5 w-5" />
        </button>

        {activeLabel && (
          <span
            role="status"
            aria-live="polite"
            className="inline-flex max-w-xs shrink items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground"
          >
            <span className="sr-only">{`${selectedLabelText}: ${labelToText[activeLabel]}`}</span>
            <span aria-hidden="true">{labelToText[activeLabel]}</span>
            <button
              type="button"
              aria-label={t("ui.composer.clear_label")}
              onClick={() => {
                setActiveLabel(null);
                textareaRef.current?.focus();
              }}
              className="text-base leading-none transition hover:opacity-70"
            >
              ×
            </button>
          </span>
        )}

        {isDropupOpen && (
          <div
            role="menu"
            className="absolute bottom-12 left-0 z-10 w-64 rounded-xl border border-border bg-[color:var(--medx-surface)] text-left shadow-lg dark:bg-[color:var(--medx-panel)]"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:hover:bg-white/10"
              onClick={() => {
                setActiveLabel("upload");
                setDropupOpen(false);
                fileInputRef.current?.click();
                textareaRef.current?.focus();
              }}
            >
              {uploadOptionText}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:hover:bg-white/10"
              onClick={() => {
                setActiveLabel("study");
                setDropupOpen(false);
                textareaRef.current?.focus();
              }}
            >
              {studyOptionText}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:hover:bg-white/10"
              onClick={() => {
                setActiveLabel("thinking");
                setDropupOpen(false);
                textareaRef.current?.focus();
              }}
            >
              {thinkingOptionText}
            </button>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={event => {
          const files = Array.from(event.target.files ?? []);
          if (files.length === 0) return;
          // TODO: pass `files` into your upload pipeline (do not create thread yet)
          event.target.value = "";
        }}
      />
      <textarea
        key={lang}
        ref={textareaRef}
        value={text}
        onChange={e => {
          const value = e.target.value;
          setText(value);
          if (!currentId) {
            setDraftText(value);
          }
        }}
        placeholder={composerPlaceholder}
        aria-label={composerPlaceholder}
        disabled={isSending}
        rows={1}
        onKeyDown={event => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
          }
        }}
        className="min-h-[40px] max-h-[160px] flex-1 resize-none bg-transparent text-base leading-snug text-[color:var(--medx-text)] placeholder:text-slate-400 focus:outline-none dark:text-[color:var(--medx-text)] dark:placeholder:text-slate-500"
      />
      <button
        type="submit"
        aria-label={sendText}
        title={sendText}
        disabled={!text.trim() || isSending}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400"
      >
        <SendHorizontal className="h-5 w-5" />
      </button>
    </form>
  );
}

