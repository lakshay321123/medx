import Markdown from "react-markdown";
import FeedbackControls from "./FeedbackControls";

interface MessageProps {
  message: { id: string; text: string };
}

export default function Message({ message }: MessageProps) {
  return (
    <div>
      <Markdown>{message.text}</Markdown>
      <div className="mt-2">
        <FeedbackControls messageId={message.id} />
      </div>
    </div>
  );
}
