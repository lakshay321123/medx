"use client";

import SuggestBar from "@/components/suggest/SuggestBar";

type ChatSuggestionsProps = {
  suggestions: string[];
  onSelect: (question: string) => void;
};

export default function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  if (!suggestions?.length) return null;

  return (
    <SuggestBar
      title="Popular questions"
      suggestions={suggestions}
      onPick={onSelect}
    />
  );
}
