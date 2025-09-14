'use client';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { sourceLabelFromUrl } from "@/lib/url";
import { normalizeExternalHref } from './SafeLink';
import { linkify } from './AutoLink';
import { PROSE_CLASS } from "./markdownStyles";

export default function Markdown({ text }: { text: string }) {
  marked.setOptions({ gfm: true, breaks: true });
  const raw = linkify(text);
  const sanitized = DOMPurify.sanitize(marked.parse(raw) as string, {
    ADD_ATTR: ['target', 'rel'],
  });
  const withSafeLinks = sanitized.replace(/<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, href, inner) => {
    const safe = normalizeExternalHref(href);
    if (!safe) {
      return `<span class="inline-flex items-center rounded-full border border-slate-200 dark:border-gray-700 px-2 py-1 text-xs text-slate-400" title="Link unavailable">${inner}</span>`;
    }
    // If inner text is empty or a raw URL, swap to source label
    const cleanInner = String(inner || "").trim();
    const useLabel = (!cleanInner || /^https?:\/\//i.test(cleanInner)) ? sourceLabelFromUrl(safe) : cleanInner;

    return `<a href="${safe}" target="_blank" rel="noopener noreferrer"
    class="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-gray-800 transition">
      <span>${useLabel}</span><span aria-hidden="true" class="opacity-70">↗</span>
  </a>`;
  });
  return <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: withSafeLinks }} />;
}
