"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { useOpenPass } from "@/hooks/useOpenPass";
import { Plus, SendHorizontal } from "lucide-react";
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
  const addDraftAttachments = useChatStore(s => s.addDraftAttachments);
  const openPass = useOpenPass();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const t = useT();
  const uploadText = t("ui.composer.upload");
  const sendText = t("ui.composer.send");
  const rawPlaceholder = t("ui.composer.placeholder");
  const composerPlaceholder =
    rawPlaceholder === "Send a message" ? "Ask a question" : rawPlaceholder;
  const { lang } = usePrefs();
  const openPrefs = useUIStore((state) => state.openPrefs);

  const redirectToAccount = useCallback(() => {
    openPrefs("Account");
  }, [openPrefs]);

  const ensureThread = useCallback(() => {
    const state = useChatStore.getState();
    return state.currentId ?? state.startNewThread();
  }, []);

  const autosize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 180);
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    if (currentId) {
      setText("");
      autosize();
      return;
    }
    const pendingText = draft.text ?? "";
    setText(pendingText);
  }, [autosize, currentId, draft.text]);

  useLayoutEffect(() => {
    autosize();
  }, [autosize]);

  useEffect(() => {
    autosize();
  }, [text, autosize]);

  const handleFiles = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) {
        event.target.value = "";
        return;
      }
      if (!currentId) {
        addDraftAttachments(files);
      }
      event.target.value = "";
    },
    [addDraftAttachments, currentId],
  );

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
      autosize();

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

  const attachUnavailableText = "Attach files is available before you start a new chat";
  const attachControlLabel = currentId ? attachUnavailableText : uploadText;

  return (
    <form
      onSubmit={handleSubmit}
      className="chat-input-container flex h-12 w-full items-center gap-2 rounded-2xl border border-[color:var(--medx-outline)] bg-[color:var(--medx-surface)] px-3 shadow-sm transition dark:border-white/10 dark:bg-[color:var(--medx-panel)] md:border-0 md:bg-transparent md:px-0 md:shadow-none"
    >
      <label
        htmlFor="chat-composer-file-input"
        role="button"
        tabIndex={currentId ? -1 : 0}
        aria-disabled={currentId ? true : undefined}
        aria-label={attachControlLabel}
        title={attachControlLabel}
        className={[
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          "text-[color:var(--medx-text)] dark:text-[color:var(--medx-text)]",
          "transition-colors",
          currentId
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:hover:bg-white/10",
        ].join(" ")}
        onClick={event => {
          if (currentId) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={event => {
          if (currentId) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <Plus className="h-5 w-5" />
      </label>
      <input
        id="chat-composer-file-input"
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <textarea
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
        className="flex-1 min-w-0 resize-none overflow-hidden bg-transparent py-0 text-base leading-6 text-[color:var(--medx-text)] placeholder:text-slate-400 focus:outline-none dark:text-[color:var(--medx-text)] dark:placeholder:text-slate-500"
      />
      <button
        type="submit"
        aria-label={sendText}
        title={sendText}
        disabled={!text.trim() || isSending}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400"
      >
        <SendHorizontal className="h-5 w-5" />
      </button>
    </form>
  );
}

