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
  
  // Convert standalone bold lines to ## headings (major sections)
  s = s.replace(/^(?:\*\*|__)\s*([^*\n][^*\n]+?)\s*(?:\*\*|__)\s*$/gm, (match, p1) => {
    const text = p1.trim();
    // Major section headings get ##
    if (/^(What it is|What actually works|What does not work|What does NOT work|When to see a doctor|Types|References|Summary)/i.test(text)) {
      return "## " + text;
    }
    // Sub-section headings get ###
    return "### " + text;
  });
  
  // Convert bold text at START of bullet points into ### sub-headings
  // Pattern: "- **Something:** rest of text" or "- **Something** (description)"
  s = s.replace(/^(\s*[-*]\s+)\*\*([^*]+?)\*\*\s*[:()]?/gm, (match, prefix, heading) => {
    const cleaned = heading.trim().replace(/:$/, "");
    // Check if this looks like a sub-heading (short, descriptive)
    if (cleaned.split(/\s+/).length <= 8 && !/\d{2,}/.test(cleaned)) {
      return "\n### " + cleaned + "\n" + prefix;
    }
    return match;
  });
  
  // Convert "What helps:" patterns that appear as bold in bullets
  s = s.replace(/^(\s*[-*]\s+)?\*\*(What helps|What helps \(.*?\)|Clues|How to use|Safety|Product tips|References)\*\*\s*:?/gim, 
    (match, bullet, heading) => "\n### " + heading.trim());
  
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


// --- Thinking/Reasoning Block ---
function ThinkingBlock({ content }: { content: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="mb-4 rounded-lg border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] overflow-hidden"
    >
      <summary className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium cursor-pointer select-none bg-[var(--so-bg-secondary,#F2F2F7)] dark:bg-[var(--so-bg-secondary,#1C1C1E)] text-[var(--so-text-secondary,#8E8E93)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? 'rotate-90' : ''}`}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span>{open ? 'Reasoning' : 'Show reasoning'}</span>
      </summary>
      <div className="px-3 py-2 text-[13px] leading-relaxed text-[var(--so-text-secondary,#8E8E93)] border-t border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)]">
        {content.split('\n').filter(Boolean).map((line, i) => (
          <p key={i} className="my-1">{line.replace(/^[-•]\s*/, '')}</p>
        ))}
      </div>
    </details>
  );
}

function splitThinking(raw: string): { thinking: string | null; answer: string } {
  const match = raw.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (!match) return { thinking: null, answer: raw };
  const thinking = match[1].trim();
  const answer = raw.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim();
  return { thinking, answer };
}

export default function ChatMarkdown({ content, formatId, userPrompt }: { content: string; formatId?: FormatId; userPrompt?: string }) {
  const { language } = useI18n();
  const guarded = ensureTable(content, formatId, userPrompt);
  const safeContent = enforceLocale(guarded, language ?? 'en', { forbidEnglishHeadings: true });
  const prepared = normalizeLLM(normalize(safeContent));
  const { thinking, answer: answerContent } = splitThinking(prepared);

  return (
    <div
      className="
        message-content prose prose-slate dark:prose-invert max-w-none prose-medx
        prose-headings:font-bold
        prose-h2:text-[1.15rem] prose-h3:text-[1.05rem] prose-h4:text-[0.95rem]
        prose-p:my-2 prose-li:my-1
        leading-[1.7] text-[15px]
      "
    >
      {thinking && <ThinkingBlock content={thinking} />}
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
        {answerContent}
      </ReactMarkdown>
    </div>
  );
}

