"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-slate dark:prose-invert prose-medx max-w-none prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3 prose-h1:text-chat-lg prose-h2:text-chat-base prose-h3:text-chat-sm prose-p:text-chat-base prose-li:text-chat-base prose-strong:font-semibold prose-a:text-blue-600 prose-a:underline">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
