"use client";

import Markdown from "react-markdown";
import FeedbackControls from "./FeedbackControls";
import { ListenButton } from "@/components/voice/ListenButton";
import { useT } from "@/components/hooks/useI18n";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  kind?: "text" | "image";
  content?: string;
  imageUrl?: string;
  pending?: boolean;
  createdAt?: number;
};

interface MessageProps {
  message: ChatMessage;
}

export default function Message({ message }: MessageProps) {
  const t = useT();
  const lang = t.lang;
  const textContent = message.content ?? "";

  if (message.kind === "image" && message.imageUrl) {
    return (
      <div className={`my-2 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[65%] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <img
            src={message.imageUrl}
            alt="Uploaded"
            className="block max-h-[360px] w-auto object-contain sm:max-h-[240px]"
          />
          {message.pending && (
            <div className="p-2 text-xs opacity-70 dark:text-gray-300 text-gray-600">Analyzing…</div>
          )}
        </div>
      </div>
    );
  }

  const isAssistant = message.role === "assistant";
  const hasReadableText = textContent.trim().length > 0;

  return (
    <div>
      {isAssistant && hasReadableText ? (
        <div className="mb-2">
          <div className="flex items-center justify-between overflow-visible">
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Assistant
            </span>
            <ListenButton
              getText={() => textContent}
              lang={lang}
              className="relative z-[2] text-[11px]"
            />
          </div>
          <Markdown>{textContent}</Markdown>
        </div>
      ) : (
        <Markdown>{textContent}</Markdown>
      )}
      <div className="mt-2">
        <FeedbackControls messageId={message.id} />
      </div>
    </div>
  );
}
