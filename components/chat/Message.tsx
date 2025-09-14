'use client';

import FeedbackControls from "./FeedbackControls";
import ChatMarkdown from "@/components/ChatMarkdown";
import { FollowUpChips } from "@/components/FollowUpChips";

interface MessageProps {
  message: { id: string; text: string; plan?: { followUps: string[] } };
  onPick?: (opt: string) => void;
}

export default function Message({ message, onPick }: MessageProps) {
  return (
    <div>
      <ChatMarkdown content={message.text} />
      {message.plan?.followUps?.length ? (
        <FollowUpChips options={message.plan.followUps} onPick={onPick || (() => {})} />
      ) : null}
      <div className="mt-2">
        <FeedbackControls messageId={message.id} />
      </div>
    </div>
  );
}
