"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";
import "katex/dist/katex.min.css";
import { LinkBadge } from "./SafeLink";
import { useI18n } from "@/lib/i18n/useI18n";
import { enforceLocale } from "@/lib/i18n/enforce";
import type { FormatId } from "@/lib/formats/types";
import { hasMarkdownTable, shapeToTable } from "@/lib/formats/tableShape";

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

const tableSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  attributes: {
    ...(defaultSchema.attributes || {}),
    table: ["className"],
    th: ["align", "colspan", "rowspan"],
    td: ["align", "colspan", "rowspan"],
  },
};

function ensureTable(content: string, formatId?: FormatId, userPrompt?: string) {
  if (formatId !== "table_compare") return content;
  const body = content || "";
  if (body.includes("```table") || hasMarkdownTable(body)) return body;
  const subject = (userPrompt || "").split("\n")[0]?.trim() || "Comparison";
  return shapeToTable(subject, body);
}

export default function ChatMarkdown({ content, formatId, userPrompt }: { content: string; formatId?: FormatId; userPrompt?: string }) {
  const { language } = useI18n();
  const guarded = ensureTable(content, formatId, userPrompt);
  const safeContent = enforceLocale(guarded, language ?? 'en', { forbidEnglishHeadings: true });
  const prepared = normalizeLLM(normalize(safeContent));

  return (
    <div
      className="
        message-content prose prose-slate dark:prose-invert max-w-none overflow-x-auto
        prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3
        prose-h3:text-lg prose-h4:text-base
        prose-p:my-2 prose-li:my-1 prose-strong:font-medium
        leading-7 text-[15px]
      "
    >
      <style jsx global>{`
        .message-content.prose table { table-layout: fixed; width: 100%; }
        .message-content.prose th,
        .message-content.prose td { word-wrap: break-word; white-space: normal; vertical-align: top; }
        .message-content.prose th { position: sticky; top: 0; background: var(--bg-elevated); z-index: 1; }
        .message-content.prose td,
        .message-content.prose th { padding: .5rem .6rem; font-size: .9rem; line-height: 1.25rem; }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeSanitize, tableSchema], rehypeKatex]}
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
    </div>
  );
}

