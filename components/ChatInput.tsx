"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { useOpenPass } from "@/hooks/useOpenPass";
import { Plus, SendHorizontal, Square } from "lucide-react";
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
  const isStreaming = useChatStore(s => s.isStreaming);
  const stopStream = useChatStore(s => s.stopStream);
  const openPass = useOpenPass();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const t = useT();
  const uploadText = t("ui.composer.upload");
  const sendText = t("ui.composer.send");
  const stopText = t("actions.stop");
  const composerPlaceholder = t("ui.composer.placeholder");
  const { lang } = usePrefs();
  const openPrefs = useUIStore((state) => state.openPrefs);

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
    // TODO: feed to your upload pipeline; do NOT create thread here
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
      className="chat-input-container flex w-full items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-sm transition md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none"
    >
      <button
        type="button"
        aria-label={uploadText}
        title={uploadText}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        onClick={() => {
          fileInputRef.current?.click();
        }}
      >
        <Plus className="h-5 w-5 text-[var(--text-muted)]" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={event => {
          const files = Array.from(event.target.files ?? []);
          if (files.length === 0) return;
          // TODO: queue files in your upload pipeline; do NOT create thread yet
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
        className="min-h-[40px] max-h-[160px] flex-1 resize-none overflow-y-auto rounded-md bg-transparent px-3 py-2 text-[15px] leading-[1.2] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] md:text-[14px]"
      />
      {isStreaming && (
        <button
          type="button"
          aria-label={stopText}
          title={stopText}
          onClick={stopStream}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <Square className="h-4 w-4" />
        </button>
      )}
      <button
        type="submit"
        aria-label={sendText}
        title={sendText}
        disabled={!text.trim() || isSending}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SendHorizontal className="h-5 w-5 text-white" />
      </button>
    </form>
  );
}

