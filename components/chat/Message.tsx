'use client';
import Markdown from "react-markdown";
import FeedbackControls from "./FeedbackControls";
import { Renderer } from "./Renderer";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  kind?: "text" | "image";
  content?: string;
  imageUrl?: string;
  pending?: boolean;
  createdAt?: number;
  attachments?: string[];
};

interface MessageProps {
  message?: ChatMessage | null;
}

const userBubble =
  "ml-auto my-2 max-w-[88vw] rounded-2xl bg-[#2563EB] px-3 py-2 text-[15px] leading-[1.6] text-white md:my-3 md:max-w-[720px] md:px-4 md:py-3 md:text-base";
const assistantBubble =
  "mr-auto my-2 max-w-[88vw] rounded-2xl bg-[#13233D] px-3 pb-6 pt-2 text-[15px] leading-[1.6] text-[#E6EDF7] shadow-sm md:my-3 md:max-w-[720px] md:px-4 md:pb-4 md:pt-3 md:text-base";

export default function Message({ message }: MessageProps) {
  const safeMessage: ChatMessage = {
    id: message?.id ?? "message",
    role: message?.role ?? "assistant",
    kind: message?.kind,
    content: message?.content,
    imageUrl: message?.imageUrl,
    pending: message?.pending,
    createdAt: message?.createdAt,
    attachments: Array.isArray(message?.attachments) ? message.attachments : [],
  };

  if (safeMessage.kind === "image" && typeof safeMessage.imageUrl === "string" && safeMessage.imageUrl) {
    return (
      <div className={`flex ${safeMessage.role === "user" ? "justify-end" : "justify-start"} px-1`}>
        <div className="my-2 max-w-[88vw] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 md:max-w-[480px]">
          <img src={safeMessage.imageUrl} alt="Uploaded" className="block h-auto max-h-[320px] w-full object-cover" />
          {safeMessage.pending && <div className="px-3 py-2 text-xs text-slate-300">Analyzing…</div>}
        </div>
      </div>
    );
  }

  const isUser = safeMessage.role === "user";
  const attachments = Array.isArray(safeMessage.attachments) ? safeMessage.attachments : [];
  const content = typeof safeMessage.content === "string" ? safeMessage.content : "";

  return (
    <div className={`relative flex ${isUser ? "justify-end" : "justify-start"} px-1`}>
      <div className={`relative ${isUser ? userBubble : assistantBubble}`}>
        {attachments.length > 0 && (
          <div
            className={`mb-2 flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            {attachments.map((src, idx) => (
              <img
                key={`${safeMessage.id}-att-${idx}`}
                src={src}
                alt="Attachment"
                className="h-24 w-24 flex-shrink-0 rounded-xl border border-[#E2E8F0] object-cover dark:border-[#1E3A5F]"
              />
            ))}
          </div>
        )}
        {content ? <Markdown components={Renderer}>{content}</Markdown> : null}

        {!isUser && (
          <FeedbackControls
            messageId={safeMessage.id}
            compact
            className="absolute -bottom-5 right-2 flex md:static md:mt-1"
          />
        )}
      </div>
    </div>
  );
}

