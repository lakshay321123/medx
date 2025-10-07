"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { useOpenPass } from "@/hooks/useOpenPass";
import { Brain, GraduationCap, Plus, SendHorizontal, Upload } from "lucide-react";
import { useT } from "@/components/hooks/useI18n";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { useUIStore } from "@/components/hooks/useUIStore";

export function ChatInput({
  onSend,
  canSend,
}: {
  onSend: (text: string, locationToken?: string, lang?: string) => Promise<void>;
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
  const uploadMenuRef = useRef<HTMLDivElement | null>(null);
  const uploadTriggerRef = useRef<HTMLButtonElement | null>(null);
  const t = useT();
  const uploadText = t("ui.composer.upload");
  const sendText = t("ui.composer.send");
  const composerPlaceholder = t("ui.composer.placeholder");
  const studyLearnText = t("ui.composer.study_learn");
  const thinkingModeText = t("ui.composer.thinking_mode");
  const { lang } = usePrefs();
  const openPrefs = useUIStore((state) => state.openPrefs);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

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
    const query = window.matchMedia("(min-width: 768px)");
    const update = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(event.matches);
    };
    update(query);
    const listener = (event: MediaQueryListEvent) => update(event);
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", listener);
      return () => query.removeEventListener("change", listener);
    }
    query.addListener(listener);
    return () => query.removeListener(listener);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const minHeight = isDesktop ? 56 : 48;
    const next = Math.min(Math.max(el.scrollHeight, minHeight), 160);
    el.style.height = `${next}px`;
  }, [text, isDesktop]);

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

      await onSend(content, locationToken, lang); // your existing streaming/send logic
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

  useEffect(() => {
    if (!isUploadMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (uploadMenuRef.current?.contains(target)) return;
      if (uploadTriggerRef.current?.contains(target)) return;
      setIsUploadMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isUploadMenuOpen]);

  useEffect(() => {
    if (!isUploadMenuOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUploadMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isUploadMenuOpen]);

  useEffect(() => {
    if (currentId) {
      setIsUploadMenuOpen(false);
    }
  }, [currentId]);

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
      className="chat-input-container mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-[color:var(--medx-outline)] bg-[color:var(--medx-surface)] px-4 py-3 shadow-sm transition dark:border-white/10 dark:bg-[color:var(--medx-panel)] md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none"
    >
      <div className="relative">
        <button
          ref={uploadTriggerRef}
          type="button"
          disabled={!!currentId}
          aria-haspopup="menu"
          aria-expanded={isUploadMenuOpen}
          aria-label={
            currentId
              ? "Attach files is available before you start a new chat"
              : uploadText
          }
          className="flex h-12 w-12 items-center justify-center rounded-full text-[color:var(--medx-text)] transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-[color:var(--medx-text)] dark:hover:bg-white/10 md:h-12 md:w-12"
          onClick={() => {
            if (currentId) {
              return;
            }
            setIsUploadMenuOpen((open) => !open);
          }}
        >
          <Plus className="h-5 w-5" />
        </button>

        {isUploadMenuOpen && (
          <div
            ref={uploadMenuRef}
            role="menu"
            className="absolute bottom-14 left-0 z-20 w-56 rounded-xl border border-[color:var(--medx-outline)] bg-[color:var(--medx-surface)] p-1 text-[color:var(--medx-text)] shadow-lg backdrop-blur dark:border-white/10 dark:bg-[color:var(--medx-panel)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsUploadMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
            >
              <Upload className="h-4 w-4 text-[color:var(--medx-text)] opacity-80" />
              {uploadText}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsUploadMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
            >
              <GraduationCap className="h-4 w-4 text-[color:var(--medx-text)] opacity-80" />
              {studyLearnText}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsUploadMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
            >
              <Brain className="h-4 w-4 text-[color:var(--medx-text)] opacity-80" />
              {thinkingModeText}
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
        className="min-h-[48px] max-h-[160px] flex-1 resize-none bg-transparent text-base leading-snug text-[color:var(--medx-text)] placeholder:text-slate-400 focus:outline-none dark:text-[color:var(--medx-text)] dark:placeholder:text-slate-500 md:min-h-[56px]"
      />
      <button
        type="submit"
        aria-label={sendText}
        title={sendText}
        disabled={!text.trim() || isSending}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400 md:h-12 md:w-12"
      >
        <SendHorizontal className="h-5 w-5" />
      </button>
    </form>
  );
}

