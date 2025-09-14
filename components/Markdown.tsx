'use client';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { normalizeExternalHref } from './SafeLink';
import { linkify } from './AutoLink';
import React from 'react';

marked.setOptions({ gfm: true, breaks: true });

export default function Markdown({ text }: { text: string }) {
  const raw = linkify(text);
  const html = marked.parse(raw) as string;
  const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
  const withSafeLinks = sanitized.replace(
    /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
    (_m, href, inner) => {
      const safe = normalizeExternalHref(href);
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer"
        class="underline underline-offset-2 hover:opacity-80">${inner}</a>`;
    }
  );
  return (
    <article
      className="prose prose-zinc max-w-none
                 prose-headings:font-semibold
                 prose-strong:font-semibold
                 prose-em:italic
                 prose-ul:list-disc prose-ol:list-decimal
                 prose-li:my-0.5
                 prose-table:table-auto prose-th:font-semibold prose-th:px-2 prose-td:px-2
                 dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: withSafeLinks }}
    />
  );
}
