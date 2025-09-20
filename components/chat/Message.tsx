import ChatMarkdown from "@/components/ChatMarkdown";
import FeedbackControls from "./FeedbackControls";

interface MessageProps {
  message: { id: string; text: string };
}

export default function Message({ message }: MessageProps) {
  return (
    <div>
      <ChatMarkdown text={message.text} />
      <div className="mt-2">
        <FeedbackControls messageId={message.id} />
      </div>
    </div>
  );
}
