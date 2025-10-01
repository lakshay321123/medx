import ChatMarkdown from "@/components/ChatMarkdown";
import type { ChatMessage } from "@/lib/state/chatStore";

type AssistantBubbleProps = {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
};

export function AssistantBubble({ message, onRetry }: AssistantBubbleProps) {
  const isPartial = message.status === "assistant-partial";
  const canRetry = isPartial && typeof onRetry === "function";

  return (
    <div className="space-y-2">
      <ChatMarkdown content={message.content ?? ""} />
      {(isPartial || canRetry) && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
          {isPartial ? (
            <span className="inline-flex items-center rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:text-slate-200">
              Partial
            </span>
          ) : null}
          {canRetry ? (
            <button
              type="button"
              onClick={() => onRetry?.(message)}
              className="font-medium text-indigo-600 transition hover:underline dark:text-indigo-300"
            >
              Retry
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default AssistantBubble;
