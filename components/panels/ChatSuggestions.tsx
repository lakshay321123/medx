"use client";

import SuggestBar from "@/components/suggest/SuggestBar";

type ChatSuggestionsProps = {
  suggestions: string[];
  onSelect: (question: string) => void;
};

export default function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  if (!suggestions?.length) return null;

  return (
    <div className="mx-auto mb-4 w-full max-w-3xl">
      <SuggestBar
        title="Popular questions"
        suggestions={suggestions}
        onPick={onSelect}
        className="sticky top-2 z-10 rounded-2xl border border-zinc-200 bg-white/90 p-3 backdrop-blur dark:border-zinc-700 dark:bg-slate-900/80"
      />
    </div>
  );
}
