"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { LinkBadge } from "./SafeLink";

/**
 * 1) If the whole message is in a single ```fence```, unwrap it
 * 2) Convert ASCII rulers (====, ----, ____ lines) to <hr/>
 * 3) Fix accidental centered blocks, compress blank lines
 * 4) Upgrade solo "**Title**" lines into proper ### headings
 * 5) Ensure list bullets render as real lists (lines starting with "* " -> "- ")
 */
function normalizeContent(raw: string): string {
  if (!raw) return "";

  let s = raw.trim();

  // 1) Unwrap a single full-message fence (no language or plain text)
  const fence = /^```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)\n```$/m.exec(s);
  if (fence) {
    const lang = (fence[1] || "").toLowerCase();
    if (!lang || lang === "text" || lang === "txt") s = fence[2];
  }

  // 2) ASCII rulers -> <hr/> (we'll map to '---' which markdown rehype renders as <hr/>)
  s = s
    .split("\n")
    .map((line) =>
      /^[=\-_]{6,}\s*$/.test(line) ? "---" : line
    )
    .join("\n");

  // 3) Compress blank lines (avoid huge gaps)
  s = s.replace(/\n{3,}/g, "\n\n");

  // 4) Upgrade standalone bold lines to headings (### Title)
  //    Example: "**Characteristics of Stage 2 Cancer**" -> "### Characteristics of Stage 2 Cancer"
  s = s.replace(
    /^(?:\*\*|__)\s*([^*\n][^*\n]+?)\s*(?:\*\*|__)\s*$/gm,
    "### $1"
  );

  // 5) Normalize list bullets (some replies use "* " inconsistently)
  s = s.replace(/^\*\s+/gm, "- ");

  // 6) Trim trailing spaces
  s = s.trim() + "\n";
  return s;
}

export default function ChatMarkdown({ content }: { content: string }) {
  const prepared = normalizeContent(content || "");

  return (
    <div
      // Typography tuned for medical text (compact, calm)
      className="
        text-left
        prose prose-slate dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:leading-tight
        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
        prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1
        leading-7 text-[15px]
        [word-break:break-word]
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <LinkBadge href={href as string}>{children as any}</LinkBadge>
          ),
          // Slightly tighter lists
          ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
          // Softer horizontal rule for the old "====" separators
          hr: () => <hr className="my-3 border-dashed opacity-40" />,
          // Prevent accidental center alignment from model text
          p: ({ children }) => <p className="text-left">{children}</p>,
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
