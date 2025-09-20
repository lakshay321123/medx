import FeedbackControls from "./FeedbackControls";
import { AssistantContent } from "@/components/citations/AssistantContent";
import { normalizeCitations } from "@/lib/normalizeCitations";

interface MessageProps {
  message: { id: string; text: string; citations?: any };
}

export default function Message({ message }: MessageProps) {
  return (
    <div>
      <AssistantContent text={message.text} citations={normalizeCitations(message)} />
      <div className="mt-2">
        <FeedbackControls messageId={message.id} />
      </div>
    </div>
  );
}
