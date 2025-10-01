'use client';
import { useT } from "@/components/hooks/useI18n";
import { useState } from "react";
import { useFeedback } from "@/hooks/useFeedback";

type Props = {
  conversationId: string;
  messageId: string;
  mode?: 'patient'|'doctor'|'research'|'therapy';
  model?: string;
  hiddenInTherapy?: boolean;
};

export default function FeedbackBar(p: Props) {
  const t = useT();
  const { submit, submittedFor, loading, error } = useFeedback();
  const key = `${p.conversationId}:${p.messageId}`;
  const submitted = submittedFor[key];
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (p.hiddenInTherapy && p.mode === "therapy") return null;

  if (submitted === 1) return <div className="mt-1 text-xs text-green-600">{t("Thanks!")}</div>;
  if (submitted === -1 && !open) {
    return (
      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
        <span>{t("Noted.")}</span>
        <button className="underline" onClick={() => setOpen(true)}>{t("Add note")}</button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
      <button
        aria-label={t("Good")}
        disabled={loading===key}
        onClick={() => submit({ conversationId:p.conversationId, messageId:p.messageId, mode:p.mode, model:p.model, rating:1 })}
        className="hover:text-gray-700"
      >👍</button>
      <button
        aria-label={t("Needs work")}
        disabled={loading===key}
        onClick={() => submit({ conversationId:p.conversationId, messageId:p.messageId, mode:p.mode, model:p.model, rating:-1 })}
        className="hover:text-gray-700"
      >👎</button>

      {open && (
        <div className="ml-2 flex items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={400}
            placeholder={t("Optional note…")}
            className="rounded border px-2 py-1 text-xs"
          />
          <button
            disabled={loading===key}
            onClick={() => submit({ conversationId:p.conversationId, messageId:p.messageId, mode:p.mode, model:p.model, rating:-1, note })}
            className="rounded border px-2 py-1"
          >{t("Send")}</button>
        </div>
      )}
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}
