'use client';
import { useFeedback } from "@/hooks/useFeedback";

type Props = {
  threadId: string;
  messageId: string;
  mode?: 'patient'|'doctor'|'research'|'therapy';
  hiddenInTherapy?: boolean;
};

export default function FeedbackBar(p: Props) {
  const { submit, submittedFor, loading, error } = useFeedback();
  const key = `${p.threadId}:${p.messageId}`;
  const submitted = submittedFor[key];

  if (p.hiddenInTherapy && p.mode === "therapy") return null;

  if (submitted) return <div className="mt-1 text-xs text-green-600">Thanks!</div>;

  return (
    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
      <button
        aria-label="Good"
        disabled={loading===key}
        onClick={() => submit({ threadId:p.threadId, messageId:p.messageId, reaction:"up" })}
        className="hover:text-gray-700"
      >👍</button>
      <button
        aria-label="Needs work"
        disabled={loading===key}
        onClick={() => submit({ threadId:p.threadId, messageId:p.messageId, reaction:"down" })}
        className="hover:text-gray-700"
      >👎</button>
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}
