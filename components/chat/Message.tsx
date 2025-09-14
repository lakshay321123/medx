import Markdown from "@/components/Markdown";
import FeedbackControls from "./FeedbackControls";

interface MessageProps {
  message: { id: string; text: string };
}

export default function Message({ message }: MessageProps) {
  return (
    <div>
      <Markdown text={message.text} />
      <div className="mt-2">
        <FeedbackControls messageId={message.id} />
      </div>
    </div>
  );
}
