"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { LinkBadge } from "./SafeLink";
import Typewriter from "@/components/chat/Typewriter";

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

// --- Renderer (preserve tags while typing) ---
// Animate only text nodes; keep <strong>, <em>, <a>, etc. intact
function TypewriterNodes({
  children, fast, onDone,
}: { children: React.ReactNode; fast?: boolean; onDone?: () => void }) {
  const map = (node: React.ReactNode, isLast = true): React.ReactNode => {
    if (typeof node === "string") {
      return <Typewriter text={node} fast={fast} onDone={isLast ? onDone : undefined} />;
    }
    if (Array.isArray(node)) {
      return node.map((n, i) => map(n, i === node.length - 1));
    }
    if (React.isValidElement(node)) {
      const kids = (node as any).props?.children;
      return React.cloneElement(node as React.ReactElement, {
        children: map(kids, true),
      });
    }
    return node;
  };
  return <>{map(children, true)}</>;
}

export default function ChatMarkdown({ content, typing = false, onDone, fast }: { content: string; typing?: boolean; onDone?: () => void; fast?: boolean }) {
  const prepared = normalize(content);

  return (
    <div
      className="
        prose prose-slate dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3
        prose-h3:text-lg prose-h4:text-base
        prose-p:my-2 prose-li:my-1 prose-strong:font-bold
        leading-relaxed text-[15px]
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <LinkBadge href={href as string}>
              {typing ? <TypewriterNodes fast={fast}>{children}</TypewriterNodes> : children}
            </LinkBadge>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
          hr: () => <hr className="my-3 border-dashed opacity-40" />,
          p: ({ children }) =>
            typing ? <p className="text-left"><TypewriterNodes fast={fast} onDone={onDone}>{children}</TypewriterNodes></p> : <p className="text-left">{children}</p>,
          li: ({ children }) =>
            typing ? <li><TypewriterNodes fast={fast}>{children}</TypewriterNodes></li> : <li>{children}</li>,
          h1: ({ children }) =>
            typing ? <h1><TypewriterNodes fast={fast}>{children}</TypewriterNodes></h1> : <h1>{children}</h1>,
          h2: ({ children }) =>
            typing ? <h2><TypewriterNodes fast={fast}>{children}</TypewriterNodes></h2> : <h2>{children}</h2>,
          h3: ({ children }) =>
            typing ? <h3><TypewriterNodes fast={fast}>{children}</TypewriterNodes></h3> : <h3>{children}</h3>,
          h4: ({ children }) =>
            typing ? <h4><TypewriterNodes fast={fast}>{children}</TypewriterNodes></h4> : <h4>{children}</h4>,
          strong: ({ children }) =>
            typing ? <strong><TypewriterNodes fast={fast}>{children}</TypewriterNodes></strong> : <strong>{children}</strong>,
          em: ({ children }) =>
            typing ? <em><TypewriterNodes fast={fast}>{children}</TypewriterNodes></em> : <em>{children}</em>,
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
