'use client';

import TrialsTable from "@/components/TrialsTable";
import Markdown from "@/components/Markdown";

export default function MessageRenderer({ message }: { message: { text: string; payload?: any } }) {
  // 1) Structured table first
  if (message?.payload?.kind === "trials_table") {
    return <TrialsTable payload={message.payload} markdownFallback={message.text} />;
  }
  // 2) Fallback: regular markdown (existing behavior)
  return <Markdown text={message.text} />;
}
