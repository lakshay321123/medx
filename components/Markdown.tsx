'use client';
import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { normalizeExternalHref } from './SafeLink';
import { linkify } from './AutoLink';

type Props = {
  /** If omitted, content is taken from children */
  text?: string;
  children?: React.ReactNode;
};

// Enable GitHub-flavored markdown (lists, tables) and soft line breaks.
marked.setOptions({ gfm: true, breaks: true });

function childrenToString(children: React.ReactNode): string {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(childrenToString).join('');
  if (typeof children === 'number' || typeof children === 'boolean') return String(children);
  // Fallback – most chat payloads are strings; this prevents silent drops.
  // @ts-ignore
  return String(children ?? '');
}

export default function Markdown({ text, children }: Props) {
  const rawInput = text ?? childrenToString(children);
  const raw = linkify(rawInput);
  const html = marked.parse(raw) as string;

  // Sanitize and enforce safe external links
  const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
  const withSafeLinks = sanitized.replace(
    /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
    (_m, href, inner) => {
      const safe = normalizeExternalHref(href);
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="mdk-link">${inner}</a>`;
    }
  );

  return (
    <>
      <div className="mdk-body" dangerouslySetInnerHTML={{ __html: withSafeLinks }} />
      <style jsx>{`
        .mdk-body :global(h1) { font-weight: 600; font-size: 1.125rem; margin: 0.5rem 0; }
        .mdk-body :global(h2) { font-weight: 600; font-size: 1rem;     margin: 0.75rem 0 0.25rem; }
        .mdk-body :global(h3) { font-weight: 600; font-size: 0.95rem;   margin: 0.5rem 0 0.25rem; }
        .mdk-body :global(strong) { font-weight: 600; }
        .mdk-body :global(em) { font-style: italic; }
        .mdk-body :global(ul) { list-style: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
        .mdk-body :global(ol) { list-style: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
        .mdk-body :global(li) { margin: 0.125rem 0; }
        .mdk-body :global(blockquote) { border-left: 3px solid rgba(0,0,0,0.15); padding: 0.25rem 0.75rem; margin: 0.5rem 0; opacity: 0.9; }
        .mdk-body :global(hr) { border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 0.75rem 0; }
        .mdk-body :global(table) { border-collapse: collapse; margin: 0.5rem 0; }
        .mdk-body :global(th), .mdk-body :global(td) { border: 1px solid rgba(0,0,0,0.1); padding: 0.25rem 0.5rem; text-align: left; vertical-align: top; }
        .mdk-link { text-decoration: underline; text-underline-offset: 2px; }
      `}</style>
    </>
  );
}

