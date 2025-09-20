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

function AutoCollapse({ children, maxHeight = 600 }: { children: React.ReactNode; maxHeight?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [collapse, setCollapse] = React.useState(false);
  React.useEffect(() => {
    if (!ref.current) return;
    const shouldCollapse = ref.current.scrollHeight > maxHeight && !expanded;
    setCollapse(shouldCollapse);
    if (expanded && ref.current) {
      ref.current.style.maxHeight = "none";
    }
  }, [expanded, maxHeight, children]);
  return (
    <div>
      <div
        ref={ref}
        className={collapse ? "max-h-[600px] overflow-hidden" : ""}
      >
        {children}
      </div>
      {collapse && (
        <button
          type="button"
          className="mt-3 text-sm underline opacity-80 transition hover:opacity-100"
          onClick={() => setExpanded(true)}
        >
          Show more
        </button>
      )}
    </div>
  );
}

type MarkdownCodeProps = React.ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
  node?: unknown;
};

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(children);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute right-2 top-2 rounded bg-black/10 px-2 py-1 text-xs text-black/80 transition hover:bg-black/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/20"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-auto rounded-lg bg-black/5 p-3 dark:bg-white/10">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

function normalizeLLM(s: string) {
  return (s || "")
    .replace(/\bHere:\s*/gi, "")
    .replace(/^\s*Detail:\s*-\s*/gim, "")
    .replace(/^\s*-\s*-\s*/gm, "- ")
    .replace(/^\s*-\s*$/gm, "")
    .replace(/\s+:/g, ":")
    .trim();
}

export default function ChatMarkdown({ content }: { content: string }) {
  const prepared = normalizeLLM(normalize(content));

  return (
    <div
      className="
        message-content prose prose-slate dark:prose-invert max-w-[72ch]
        prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3
        prose-h3:text-lg prose-h4:text-base
        prose-p:my-2 prose-li:my-1 prose-strong:font-medium
        leading-7 text-[15px]
      "
    >
      <AutoCollapse>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            a: ({ href, children }) => (
              <LinkBadge href={href as string}>
                {children}
              </LinkBadge>
            ),
            ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
            hr: () => <hr className="my-3 border-dashed opacity-40" />,
            p: ({ children }) => (
              <p className="text-left">{children}</p>
            ),
            li: ({ children }) => (
              <li>{children}</li>
            ),
            h1: ({ children }) => (
              <h1>{children}</h1>
            ),
            h2: ({ children }) => (
              <h2>{children}</h2>
            ),
            h3: ({ children }) => (
              <h3>{children}</h3>
            ),
            h4: ({ children }) => (
              <h4>{children}</h4>
            ),
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto">
                <table {...props}>{children}</table>
              </div>
            ),
            code: (props: MarkdownCodeProps) => {
              const { inline, children, className, ...rest } = props;
              if (inline) {
                const combined = [
                  "rounded bg-black/5 px-1 py-0.5 dark:bg-white/10",
                  className || "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <code
                    {...rest}
                    className={combined}
                  >
                    {children}
                  </code>
                );
              }

              const text = Array.isArray(children)
                ? children.join("")
                : String(children ?? "");

              return <CodeBlock className={typeof className === "string" ? className : undefined}>{text}</CodeBlock>;
            },
          }}
        >
          {prepared}
        </ReactMarkdown>
      </AutoCollapse>
    </div>
  );
}

