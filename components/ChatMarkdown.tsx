"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { LinkBadge } from "./SafeLink";

// --- Normalizer ---
// normalize: unwrap full-message fences, convert ==== to <hr>, bold-lines → headings, list bullets
function normalize(raw: string){
  let s = (raw||"").trim();
  const f = /^```([a-z0-9_-]*)\s*\n([\s\S]*?)\n```$/i.exec(s);
  if (f && (!f[1] || /^(txt|text)$/.test(f[1]))) s = f[2];
  s = s.replace(/^[=\-_]{4,}$/gm, "\n---\n");
  s = s.replace(/^(?:\*\*|__)\s*([^*\n][^*\n]+?)\s*(?:\*\*|__)\s*$/gm, "### $1");
  s = s.replace(/^\*\s+/gm, "- ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s + "\n";
}

// --- Renderer ---
export default function ChatMarkdown({ content }: { content: string }) {
  const prepared = normalize(content);

  return (
    <div
      className="
        prose prose-slate dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3
        prose-h3:text-lg prose-h4:text-base
        prose-p:my-2 prose-li:my-1 prose-strong:font-medium
        leading-relaxed text-[15px]
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <LinkBadge href={href as string}>{children as any}</LinkBadge>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
          hr: () => <hr className="my-3 border-dashed opacity-40" />,
          p: ({ children }) => <p className="text-left">{children}</p>,
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}

