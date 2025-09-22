import Markdown from "react-markdown";
import type { ChatMessage } from "@/lib/state/chatStore";
import FeedbackControls from "./FeedbackControls";

interface MessageProps {
  message: ChatMessage;
}

export default function Message({ message }: MessageProps) {
  if (message.kind === "image" && message.imageUrl) {
    return (
      <div
        className={`my-2 flex ${
          message.role === "user" ? "justify-end" : "justify-start"
        }`}
      >
        <div className="max-w-[65%] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <img
            src={message.imageUrl}
            alt="uploaded"
            className="block max-h-[360px] w-auto object-contain"
          />
          {message.pending ? (
            <div className="p-2 text-xs opacity-70">Analyzing…</div>
          ) : null}
        </div>
      </div>
    );
  }

  const text = message.content ?? "";

  return (
    <div>
      <Markdown>{text}</Markdown>
      <div className="mt-2">
        <FeedbackControls messageId={message.id} />
      </div>
    </div>
  );
}
