"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { LinkBadge } from "./SafeLink";

export default function ChatMarkdown({ content }: { content: string }) {
  const prepared = normalize(content || "");
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-li:my-1 prose-headings:mb-2 prose-headings:font-semibold text-[15px] leading-7">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {prepared}
      </ReactMarkdown>
    </div>
  );
}

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

