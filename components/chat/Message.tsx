import ChatMarkdown from "@/components/ChatMarkdown";
import FeedbackControls from "./FeedbackControls";

interface MessageProps {
  message: { id: string; text: string };
}

export default function Message({ message }: MessageProps) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ChatMarkdown content={message.text} typing={false} />
      <div className="mt-2">
        <FeedbackControls messageId={message.id} />
      </div>
    </div>
  );
}
