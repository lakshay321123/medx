'use client';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { normalizeExternalHref } from './SafeLink';
import { linkify } from './AutoLink';

export default function Markdown({ text }: { text: string }) {
  marked.setOptions({ gfm: true, breaks: true });
  const raw = linkify(text);
  const sanitized = DOMPurify.sanitize(marked.parse(raw) as string, {
    ADD_ATTR: ['target', 'rel'],
  });
  const withSafeLinks = sanitized.replace(/<a\s+[^>]*>(.*?)<\/a>/gi, (match, inner) => {
    const hrefMatch = match.match(/href="([^"]+)"/i);
    const safe = normalizeExternalHref(hrefMatch ? hrefMatch[1] : undefined);
    if (!safe) {
      return `<span class="text-slate-500 dark:text-slate-400 cursor-not-allowed" title="Link unavailable">${inner}</span>`;
    }
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 decoration-slate-400 hover:decoration-slate-600 dark:decoration-slate-500 dark:hover:decoration-slate-300">${inner}</a>`;
  });
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: withSafeLinks }} />;
}
