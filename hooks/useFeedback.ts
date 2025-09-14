import { useState } from "react";

export function useFeedback() {
  const [submittedFor, setSubmittedFor] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit({
    threadId,
    messageId,
    reaction,
  }: {
    threadId: string;
    messageId: string;
    reaction: "up" | "down";
  }) {
    const key = `${threadId}:${messageId}`;
    if (submittedFor[key]) return;

    setLoading(key);
    setError(null);
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId, messageId, reaction }),
      });
      if (!r.ok) throw new Error("save_failed");
      setSubmittedFor((s) => ({ ...s, [key]: reaction === "up" ? 1 : -1 }));
    } catch (e) {
      setError("Could not save feedback");
    } finally {
      setLoading(null);
    }
  }

  return { submit, submittedFor, loading, error };
}
