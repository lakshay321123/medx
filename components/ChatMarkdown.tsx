"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { LinkBadge } from "./SafeLink";
import Typewriter from "@/components/chat/Typewriter";
import { PROSE_CLASS } from "./markdownStyles";

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
function flattenText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(flattenText).join("");
  if (React.isValidElement(children)) return flattenText(children.props.children);
  return "";
}

function TypedSpan({ nodeChildren, onDone, fast }: { nodeChildren: React.ReactNode; onDone?: () => void; fast?: boolean }) {
  const text = flattenText(nodeChildren);
  return (
    <span>
      <Typewriter text={text} onDone={onDone} fast={fast} />
    </span>
  );
}

function TypedText({ childrenNode, fast }: { childrenNode: React.ReactNode; fast?: boolean }) {
  const text = flattenText(childrenNode);
  return <Typewriter text={text} fast={fast} />;
}

export default function ChatMarkdown({ content, typing = false, onDone, fast }: { content: string; typing?: boolean; onDone?: () => void; fast?: boolean }) {
  const prepared = normalize(content);

  return (
    <div className={PROSE_CLASS}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <LinkBadge href={href as string}>
              {typing ? <TypedText childrenNode={children} fast={fast} /> : children}
            </LinkBadge>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
          hr: () => <hr className="my-3 border-dashed opacity-40" />,
          p: ({ children }) => (
            typing ? (
              <p className="text-left">
                <TypedSpan nodeChildren={children} onDone={onDone} fast={fast} />
              </p>
            ) : (
              <p className="text-left">{children}</p>
            )
          ),
          li: ({ children }) => (
            typing ? (
              <li>
                <TypedSpan nodeChildren={children} fast={fast} />
              </li>
            ) : (
              <li>{children}</li>
            )
          ),
          h1: ({ children }) => (
            typing ? (
              <h1>
                <TypedSpan nodeChildren={children} fast={fast} />
              </h1>
            ) : (
              <h1>{children}</h1>
            )
          ),
          h2: ({ children }) => (
            typing ? (
              <h2>
                <TypedSpan nodeChildren={children} fast={fast} />
              </h2>
            ) : (
              <h2>{children}</h2>
            )
          ),
          h3: ({ children }) => (
            typing ? (
              <h3>
                <TypedSpan nodeChildren={children} fast={fast} />
              </h3>
            ) : (
              <h3>{children}</h3>
            )
          ),
          h4: ({ children }) => (
            typing ? (
              <h4>
                <TypedSpan nodeChildren={children} fast={fast} />
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

