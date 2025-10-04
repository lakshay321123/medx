"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { COMPOSER_DRAFT_THREAD_KEY, useChatStore } from "@/lib/state/chatStore";
import type { ComposerDropupLabel } from "@/lib/state/chatStore";
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

type DropupLabel = ComposerDropupLabel;
type NonUploadLabel = Exclude<DropupLabel, "upload" | null>;

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
  const composerLabels = useChatStore(s => s.composerLabels);
  const setComposerLabel = useChatStore(s => s.setComposerLabel);
  const openPass = useOpenPass();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const t = useT();
  const sendText = t("ui.composer.send");
  const composerPlaceholder = t("ui.composer.placeholder");
  const moreText = t("ui.composer.more");
  const uploadOptionText = t("ui.composer.upload_option");
  const studyOptionText = t("ui.composer.study_option");
  const thinkingOptionText = t("ui.composer.thinking_option");
  const selectedLabelText = t("ui.composer.selected_label");
  const clearLabelText = t("ui.composer.clear_label");
  const { lang } = usePrefs();
  const openPrefs = useUIStore((state) => state.openPrefs);
  const dropupRef = useRef<HTMLDivElement | null>(null);
  const [isDropupOpen, setDropupOpen] = useState(false);

  const threadKey = currentId ?? COMPOSER_DRAFT_THREAD_KEY;
  const activeLabel = composerLabels[threadKey] ?? null;

  const labelToMeta = useMemo<Record<NonUploadLabel, ComposerDropupMeta>>( 
    () => ({
      study: { formatDefault: "essay", research: 1 },
      thinking: { thinkingProfile: "balanced" },
    }),
    [],
  );

  const labelToText = useMemo(
    () => ({
      upload: uploadOptionText,
      study: studyOptionText,
      thinking: thinkingOptionText,
    }),
    [studyOptionText, thinkingOptionText, uploadOptionText],
  );

  const logSelect = useCallback((label: Exclude<DropupLabel, null>) => {
    if (typeof window === "undefined") return;
    console.log("composer.dropup.select", { label });
  }, []);

  const logClear = useCallback(() => {
    if (typeof window === "undefined") return;
    console.log("composer.dropup.clear");
  }, []);

  const clearActiveLabel = useCallback(() => {
    const state = useChatStore.getState();
    const key = state.currentId ?? COMPOSER_DRAFT_THREAD_KEY;
    const previous = state.composerLabels[key] ?? null;
    if (!previous || previous === "upload") {
      return false;
    }
    setComposerLabel(state.currentId, null);
    logClear();
    return true;
  }, [logClear, setComposerLabel]);

  const selectLabel = useCallback(
    (label: NonUploadLabel) => {
      setComposerLabel(useChatStore.getState().currentId, label);
      logSelect(label);
      setDropupOpen(false);
      textareaRef.current?.focus();
    },
    [logSelect, setComposerLabel],
  );

  const hasChip = activeLabel === "study" || activeLabel === "thinking";
  const chipLabelText = hasChip ? labelToText[activeLabel as NonUploadLabel] : "";
  const selectionAnnouncement = hasChip
    ? `${selectedLabelText}: ${chipLabelText}`
    : "";

  const registerMenuItem = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      menuRefs.current[index] = el;
    },
    [],
  );

  const handleMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const items = menuRefs.current.filter(
        (el): el is HTMLButtonElement => Boolean(el),
      );
      if (items.length === 0) return;

      const activeElement = document.activeElement;
      const currentIndex =
        activeElement instanceof HTMLButtonElement ? items.indexOf(activeElement) : -1;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
        items[nextIndex]?.focus();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        items[nextIndex]?.focus();
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus();
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1]?.focus();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setDropupOpen(false);
        clearActiveLabel();
        textareaRef.current?.focus();
      }
    },
    [clearActiveLabel],
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
    if (!isDropupOpen) {
      menuRefs.current = [];
      return;
    }
    const frame = requestAnimationFrame(() => {
      const first = menuRefs.current.find(
        (el): el is HTMLButtonElement => Boolean(el),
      );
      first?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isDropupOpen]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDropupOpen) {
        event.preventDefault();
        setDropupOpen(false);
        clearActiveLabel();
        textareaRef.current?.focus();
      }
      if (event.key === "Backspace") {
        const activeElement = document.activeElement;
        if (
          textareaRef.current &&
          activeElement === textareaRef.current &&
          text.length === 0
        ) {
          if (clearActiveLabel()) {
            textareaRef.current.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [clearActiveLabel, isDropupOpen, text]);

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

      const labelForRequest: NonUploadLabel | null =
        activeLabel === "study" || activeLabel === "thinking" ? activeLabel : null;
      const meta = labelForRequest ? labelToMeta[labelForRequest] : null;
      await onSend(content, locationToken, lang, meta);
      if (labelForRequest) {
        clearActiveLabel();
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
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            setDropupOpen(open => !open);
          }}
        >
          <Plus className="h-5 w-5" />
        </button>
        <span aria-live="polite" className="sr-only">
          {selectionAnnouncement}
        </span>
        {hasChip ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground">
            <span aria-hidden="true">{chipLabelText}</span>
            <button
              type="button"
              aria-label={clearLabelText}
              onClick={() => {
                if (clearActiveLabel()) {
                  textareaRef.current?.focus();
                }
              }}
              className="flex h-4 w-4 items-center justify-center rounded hover:bg-foreground/10"
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ) : null}

        {isDropupOpen && (
          <div
            role="menu"
            onKeyDown={handleMenuKeyDown}
            className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-64 rounded-xl border border-border bg-background p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              ref={registerMenuItem(0)}
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onClick={() => {
                logSelect("upload");
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
              ref={registerMenuItem(1)}
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onClick={() => {
                selectLabel("study");
              }}
            >
              {studyOptionText}
            </button>
            <button
              type="button"
              role="menuitem"
              ref={registerMenuItem(2)}
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onClick={() => {
                selectLabel("thinking");
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

