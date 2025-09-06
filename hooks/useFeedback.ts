import { useState } from "react";

export function useFeedback() {
  const [submittedFor, setSubmittedFor] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit({
    conversationId,
    messageId,
    mode,
    model,
    rating,
    note,
  }: {
    conversationId: string;
    messageId: string;
    mode?: "patient" | "doctor" | "research" | "therapy";
    model?: string;
    rating: 1 | -1;
    note?: string;
  }) {
    const key = `${conversationId}:${messageId}`;
    if (submittedFor[key]) return;

    setLoading(key);
    setError(null);
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messageId,
          mode,
          model,
          rating: rating === 1 ? "up" : "down",
          note,
        }),
      });
      if (!r.ok) throw new Error("save_failed");
      setSubmittedFor((s) => ({ ...s, [key]: rating }));
    } catch (e) {
      setError("Could not save feedback");
    } finally {
      setLoading(null);
    }
  }

  return { submit, submittedFor, loading, error };
}
