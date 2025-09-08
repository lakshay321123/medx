"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { LinkBadge } from "./SafeLink";

export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-slate dark:prose-invert prose-medx max-w-none prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3 prose-h1:text-chat-lg prose-h2:text-chat-base prose-h3:text-chat-sm prose-p:text-chat-base prose-li:text-chat-base prose-strong:font-semibold">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => <LinkBadge href={href as string}>{children as any}</LinkBadge>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
