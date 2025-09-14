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
function normalize(raw: string) {
  let s = (raw || "").trim();
  const f = /^```([a-z0-9_-]*)\s*\n([\s\S]*?)\n```$/i.exec(s);
  if (f && (!f[1] || /^(txt|text)$/.test(f[1]))) s = f[2];
  s = s.replace(/^[=\-_]{4,}$/gm, "\n---\n");
  s = s.replace(/^(?:\*\*|__)\s*([^*\n][^*\n]+?)\s*(?:\*\*|__)\s*$/gm, "### $1");
  s = s.replace(/^\*\s+/gm, "- ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s + "\n";
}

// --- Renderer ---
function TypewriterNodes({
  nodes,
  onDone,
  fast,
}: {
  nodes: React.ReactNode;
  onDone?: () => void;
  fast?: boolean;
}) {
  const wrap = (node: React.ReactNode, done?: () => void): React.ReactNode => {
    if (typeof node === "string") {
      return <Typewriter text={node} onDone={done} fast={fast} />;
    }
    if (Array.isArray(node)) {
      const last = node.length - 1;
      return node.map((n, i) => wrap(n, i === last ? done : undefined));
    }
    if (React.isValidElement(node)) {
      const child = wrap(node.props.children, done);
      return React.cloneElement(node, { ...node.props, children: child });
    }
    return node;
  };
  return <>{wrap(nodes, onDone)}</>;
}

export default function ChatMarkdown({
  content,
  typing = false,
  onDone,
  fast,
}: {
  content: string;
  typing?: boolean;
  onDone?: () => void;
  fast?: boolean;
}) {
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
              {typing ? <TypewriterNodes nodes={children} fast={fast} /> : children}
            </LinkBadge>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
          hr: () => <hr className="my-3 border-dashed opacity-40" />,
          p: ({ children }) => (
            typing ? (
              <p className="text-left">
                <TypewriterNodes nodes={children} onDone={onDone} fast={fast} />
              </p>
            ) : (
              <p className="text-left">{children}</p>
            )
          ),
          li: ({ children }) => (
            typing ? (
              <li>
                <TypewriterNodes nodes={children} fast={fast} />
              </li>
            ) : (
              <li>{children}</li>
            )
          ),
          h1: ({ children }) => (
            typing ? (
              <h1>
                <TypewriterNodes nodes={children} fast={fast} />
              </h1>
            ) : (
              <h1>{children}</h1>
            )
          ),
          h2: ({ children }) => (
            typing ? (
              <h2>
                <TypewriterNodes nodes={children} fast={fast} />
              </h2>
            ) : (
              <h2>{children}</h2>
            )
          ),
          h3: ({ children }) => (
            typing ? (
              <h3>
                <TypewriterNodes nodes={children} fast={fast} />
              </h3>
            ) : (
              <h3>{children}</h3>
            )
          ),
          h4: ({ children }) => (
            typing ? (
              <h4>
                <TypewriterNodes nodes={children} fast={fast} />
              </h4>
            ) : (
              <h4>{children}</h4>
            )
          ),
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}

