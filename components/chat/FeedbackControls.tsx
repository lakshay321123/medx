'use client';

type FeedbackControlsProps = {
  messageId: string;
  compact?: boolean;
  className?: string;
};

const iconClasses = "transition hover:text-[#2563EB] dark:hover:text-[#3B82F6]";

export default function FeedbackControls({ messageId, compact = false, className }: FeedbackControlsProps) {
  const size = compact ? 16 : 20;
  const spacing = compact ? "gap-2" : "gap-3";

  return (
    <div className={`flex ${spacing} text-[#94A3B8] dark:text-[#CBD5F5] ${className ?? ""}`}>
      <button
        type="button"
        className={`inline-flex items-center justify-center ${iconClasses}`}
        aria-label="Thumbs up"
        data-message={messageId}
      >
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 11h2v9H6a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zm4 9h5.4a2.6 2.6 0 0 0 2.54-2.07l1.02-5.1A2 2 0 0 0 17 11h-3.5V7.2A2.2 2.2 0 0 0 11.3 5l-1.3 6" />
        </svg>
      </button>
      <button
        type="button"
        className={`inline-flex items-center justify-center ${iconClasses}`}
        aria-label="Thumbs down"
        data-message={messageId}
      >
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 13h-2V4h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2zm-4-9h-5.4a2.6 2.6 0 0 0-2.54 2.07L4.6 11.17A2 2 0 0 0 7 13h3.5v3.8A2.2 2.2 0 0 0 12.7 21l1.3-6" />
        </svg>
      </button>
    </div>
  );
}
