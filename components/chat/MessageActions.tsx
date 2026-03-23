"use client";

import { Copy, RefreshCcw, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo } from "react";

const baseButtonClasses =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8E8E93] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--so-accent,#06B6D4)] hover:bg-[var(--so-bg-secondary,#F2F2F7)] hover:text-[var(--so-text,#000)] dark:text-[#98989D] dark:hover:bg-[#2C2C2E] dark:hover:text-white";

const disabledClasses = "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-inherit";

type MessageActionsProps = {
  conversationId: string;
  messageId: string;
  onCopy: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  onShare: () => void;
  isRefreshing?: boolean;
  disableRefresh?: boolean;
  allowFeedback: boolean;
  feedbackState: {
    submittedFor: Record<string, 1 | -1>;
    loading: string | null;
  };
  onFeedback: (rating: 1 | -1) => void;
};

function ActionButton({
  label,
  onClick,
  children,
  disabled,
  active,
  spinning,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  spinning?: boolean;
}) {
  const classes = [
    baseButtonClasses,
    disabled ? disabledClasses : "",
    active ? "!text-[var(--so-accent,#06B6D4)] dark:!text-[#5EBDCC]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={classes}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={active ? "true" : undefined}
    >
      <span className={`inline-flex items-center ${spinning ? "animate-spin" : ""}`}>{children}</span>
    </button>
  );
}

export default function MessageActions({
  conversationId,
  messageId,
  onCopy,
  onRefresh,
  onShare,
  isRefreshing = false,
  disableRefresh = false,
  allowFeedback,
  feedbackState,
  onFeedback,
}: MessageActionsProps) {
  const key = useMemo(() => `${conversationId}:${messageId}`, [conversationId, messageId]);
  const submitted = feedbackState.submittedFor[key];
  const loading = feedbackState.loading === key;

  const refreshDisabled = disableRefresh || isRefreshing || loading;
  const feedbackDisabled = loading || isRefreshing;

  const desktopRow = (
    <div className="absolute right-3 top-3 hidden gap-2 rounded-full bg-white/80 px-2 py-1 text-[#8E8E93] shadow-sm ring-1 ring-[var(--so-border,#E5E5EA)] transition md:flex md:opacity-0 md:group-hover:opacity-80 md:group-focus-within:opacity-100 dark:bg-[#1C1C1E]/80 dark:text-[#98989D] dark:ring-[#2C2C2E]">
      <ActionButton label="Copy full answer" onClick={() => void onCopy()}>
        <Copy size={14} />
      </ActionButton>
      {onRefresh ? (
        <ActionButton
          label="Refresh this answer"
          onClick={() => onRefresh?.()}
          disabled={refreshDisabled}
          spinning={isRefreshing}
        >
          <RefreshCcw size={14} />
        </ActionButton>
      ) : null}
      <ActionButton label="Share" onClick={() => onShare()}>
        <Share2 size={14} />
      </ActionButton>
      {allowFeedback && (
        <>
          <ActionButton
            label="Good answer"
            onClick={() => {
              if (submitted === 1) return;
              onFeedback(1);
            }}
            disabled={feedbackDisabled}
            active={submitted === 1}
          >
            <ThumbsUp size={14} />
          </ActionButton>
          <ActionButton
            label="Needs work"
            onClick={() => {
              if (submitted === -1) return;
              onFeedback(-1);
            }}
            disabled={feedbackDisabled}
            active={submitted === -1}
          >
            <ThumbsDown size={14} />
          </ActionButton>
        </>
      )}
    </div>
  );

  const mobileRow = (
    <div className="mt-3 flex justify-end gap-2 md:hidden">
      <ActionButton label="Copy full answer" onClick={() => void onCopy()}>
        <Copy size={14} />
      </ActionButton>
      {onRefresh ? (
        <ActionButton
          label="Refresh this answer"
          onClick={() => onRefresh?.()}
          disabled={refreshDisabled}
          spinning={isRefreshing}
        >
          <RefreshCcw size={14} />
        </ActionButton>
      ) : null}
      <ActionButton label="Share" onClick={() => onShare()}>
        <Share2 size={14} />
      </ActionButton>
      {allowFeedback && (
        <>
          <ActionButton
            label="Good answer"
            onClick={() => {
              if (submitted === 1) return;
              onFeedback(1);
            }}
            disabled={feedbackDisabled}
            active={submitted === 1}
          >
            <ThumbsUp size={14} />
          </ActionButton>
          <ActionButton
            label="Needs work"
            onClick={() => {
              if (submitted === -1) return;
              onFeedback(-1);
            }}
            disabled={feedbackDisabled}
            active={submitted === -1}
          >
            <ThumbsDown size={14} />
          </ActionButton>
        </>
      )}
    </div>
  );

  return (
    <>
      {desktopRow}
      {mobileRow}
    </>
  );
}
