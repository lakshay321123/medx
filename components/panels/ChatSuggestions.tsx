"use client";

import { useT } from "@/components/hooks/useI18n";
import SuggestBar from "@/components/suggest/SuggestBar";

type ChatSuggestionsProps = {
  suggestions: string[];
  onSelect: (question: string) => void;
};

export default function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  const t = useT();
  if (!suggestions?.length) return null;

  return (
    <SuggestBar
      title={t("Popular questions")}
      suggestions={suggestions}
      onPick={onSelect}
    />
  );
}
