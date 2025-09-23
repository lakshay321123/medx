'use client';

import { useEffect } from 'react';
import { Copy, RefreshCw, Share2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { pushToast } from '@/lib/ui/toast';
import { useFeedback } from '@/hooks/useFeedback';
import { trackEvent } from '@/lib/analytics/events';

type MessageActionsProps = {
  conversationId: string;
  messageId: string;
  mode: 'patient' | 'doctor' | 'research' | 'therapy';
  getMessageText: () => string;
  messageContent: string;
  className?: string;
  disabled?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => Promise<void> | void;
  onShare?: () => void;
  canRefresh?: boolean;
  showFeedback?: boolean;
};

const baseButtonClasses =
  'pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-slate-500 transition hover:bg-slate-200/60 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-slate-700/60 dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-40';

export default function MessageActions(props: MessageActionsProps) {
  const {
    conversationId,
    messageId,
    mode,
    getMessageText,
    messageContent,
    className,
    disabled,
    isRefreshing,
    onRefresh,
    onShare,
    canRefresh = true,
    showFeedback = true,
  } = props;

  const { submit, submittedFor, loading, error } = useFeedback();
  const feedbackKey = `${conversationId}:${messageId}`;
  const submitted = submittedFor[feedbackKey];
  const busy = loading === feedbackKey;

  useEffect(() => {
    if (error) {
      pushToast({ title: 'Could not send feedback', variant: 'destructive' });
    }
  }, [error]);

  useEffect(() => {
    if (submitted === 1 || submitted === -1) {
      trackEvent('feedback_submitted', {
        messageId,
        conversationId,
        rating: submitted,
        mode,
      });
    }
  }, [submitted, conversationId, messageId, mode]);

  const handleCopy = async () => {
    if (disabled) return;
    try {
      const text = (getMessageText() || messageContent || '').trim();
      if (!text) throw new Error('empty');
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('clipboard_unavailable');
      }
      pushToast({ title: 'Copied' });
      trackEvent('copy_clicked', { conversationId, messageId, mode });
    } catch {
      pushToast({ title: 'Could not copy message', variant: 'destructive' });
    }
  };

  const handleRefresh = async () => {
    if (disabled || !onRefresh || !canRefresh) return;
    trackEvent('refresh_clicked', { conversationId, messageId, mode });
    await onRefresh();
  };

  const handleFeedback = async (rating: 1 | -1) => {
    if (busy || disabled) return;
    await submit({ conversationId, messageId, mode, rating });
  };

  const copyClasses = baseButtonClasses;
  const refreshClasses = `${baseButtonClasses} ${(!canRefresh || disabled) ? 'opacity-40' : ''}`;
  const shareClasses = baseButtonClasses;
  const upClasses = `${baseButtonClasses} ${submitted === 1 ? 'text-blue-600 dark:text-blue-300' : ''}`;
  const downClasses = `${baseButtonClasses} ${submitted === -1 ? 'text-amber-600 dark:text-amber-300' : ''}`;

  return (
    <div
      className={`flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300 ${className ?? ''}`.trim()}
      data-message-actions
    >
      <button
        type="button"
        onClick={handleCopy}
        className={copyClasses}
        title="Copy message"
        aria-label="Copy message"
        disabled={disabled}
      >
        <Copy size={14} strokeWidth={1.8} />
      </button>
      {onRefresh && canRefresh && (
        <button
          type="button"
          onClick={handleRefresh}
          className={refreshClasses}
          title="Refresh answer"
          aria-label="Refresh answer"
          disabled={disabled || !canRefresh}
        >
          <RefreshCw
            size={14}
            strokeWidth={1.8}
            className={isRefreshing ? 'animate-spin' : ''}
          />
        </button>
      )}
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className={shareClasses}
          title="Share"
          aria-label="Share"
          disabled={disabled}
        >
          <Share2 size={14} strokeWidth={1.8} />
        </button>
      )}
      {showFeedback && (
        <>
          <button
            type="button"
            onClick={() => handleFeedback(1)}
            className={upClasses}
            title="Good answer"
            aria-pressed={submitted === 1}
            disabled={disabled || submitted === 1}
          >
            <ThumbsUp size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => handleFeedback(-1)}
            className={downClasses}
            title="Needs work"
            aria-pressed={submitted === -1}
            disabled={disabled || submitted === -1}
          >
            <ThumbsDown size={14} strokeWidth={1.8} />
          </button>
        </>
      )}
    </div>
  );
}
