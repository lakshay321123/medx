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
  message: ChatMessage;
}

const userBubble = "ml-auto max-w-[88vw] md:max-w-[720px] rounded-2xl bg-blue-600/90 px-3 py-2 leading-6 md:leading-7 my-2 md:my-3 text-white";
const assistantBubble = "mr-auto max-w-[88vw] md:max-w-[720px] rounded-2xl bg-slate-800/70 px-3 pt-2 pb-6 leading-6 md:leading-7 my-2 md:my-3 text-slate-100 md:pb-3";

export default function Message({ message }: MessageProps) {
  if (message.kind === "image" && message.imageUrl) {
    return (
      <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} px-1`}>
        <div className="my-2 max-w-[88vw] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 md:max-w-[480px]">
          <img
            src={message.imageUrl}
            alt="Uploaded"
            className="block h-auto max-h-[320px] w-full object-cover"
          />
          {message.pending && (
            <div className="px-3 py-2 text-xs text-slate-300">Analyzing…</div>
          )}
        </div>
      </div>
    );
  }

  const isUser = message.role === "user";
  const attachments = message.attachments ?? [];

  return (
    <div className={`relative flex ${isUser ? "justify-end" : "justify-start"} px-1`}> 
      <div className={`relative ${isUser ? userBubble : assistantBubble}`}>
        {attachments.length > 0 && (
          <div className={`mb-2 flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${isUser ? "justify-end" : "justify-start"}`}>
            {attachments.map((src, idx) => (
              <img
                key={`${message.id}-att-${idx}`}
                src={src}
                alt="Attachment"
                className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
              />
            ))}
          </div>
        )}
        {message.content ? (
          <Markdown components={Renderer}>{message.content}</Markdown>
        ) : null}

        {!isUser && (
          <FeedbackControls
            messageId={message.id}
            compact
            className="absolute -bottom-5 right-2 flex md:static md:mt-1"
          />
        )}
      </div>
    </div>
  );
}
