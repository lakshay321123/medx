"use client";
import { useState } from "react";
import { useT } from "@/components/hooks/useI18n";

export default function ChatErrorBubble({
  onRetry,
  compact,
}: {
  onRetry: () => Promise<void>;
  compact?: boolean;
}) {
  const t = useT();
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onRetry();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-error-bubble max-w-[80%] rounded-2xl border px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">{t("Network error")}</span>
        <span className="opacity-60">•</span>
        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label={t("Retry")}
          title={t("Retry")}
        >
          {loading ? t("Retrying…") : t("Retry")}
        </button>
      </div>
      {!compact && (
        <div className="mt-1 text-xs opacity-70">
          {t("We’ll try again using your last request.")}
        </div>
      )}
      <style jsx>{`
        .chat-error-bubble {
          --bubble-bg: var(--card);
          --hover: rgba(0, 0, 0, 0.04);
          --border: rgba(0, 0, 0, 0.12);
          --fg: inherit;
          background: var(--bubble-bg);
          border-color: var(--border);
          color: var(--fg);
        }
        :global(.dark) .chat-error-bubble {
          --hover: rgba(255, 255, 255, 0.06);
          --border: rgba(255, 255, 255, 0.12);
        }
        .chat-error-bubble button {
          border-color: var(--border);
        }
        .chat-error-bubble button:not(:disabled):hover {
          background: var(--hover);
        }
      `}</style>
    </div>
  );
}
