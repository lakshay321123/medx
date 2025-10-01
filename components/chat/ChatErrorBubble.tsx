"use client";
import { useState } from "react";
import { useT } from "@/components/hooks/useI18n";

type Props = {
  onRetry: () => Promise<void>;
  compact?: boolean;
};

export default function ChatErrorBubble({ onRetry, compact }: Props) {
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
    <div
      className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm border-[var(--border)] bg-[var(--bubble-bg)] text-[var(--fg)] dark:border-white/10 dark:bg-white/5`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{t("Network error")}</span>
        <span className="opacity-60">•</span>
        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 border-[var(--border)] hover:bg-[var(--hover)] disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10`}
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
        :root {
          --bubble-bg: var(--card);
          --hover: rgba(0, 0, 0, 0.04);
          --border: rgba(0, 0, 0, 0.12);
          --fg: inherit;
        }
        .dark :global(&) {
          --hover: rgba(255, 255, 255, 0.06);
          --border: rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </div>
  );
}
