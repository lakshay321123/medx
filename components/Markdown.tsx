'use client';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export default function Markdown({ text }: { text: string }) {
  marked.setOptions({ gfm: true, breaks: true });
  // make raw URLs clickable
  const withLinks = text.replace(/(https?:\/\/[^\s)]+)/g, '[$1]($1)');
  const html = DOMPurify.sanitize(marked.parse(withLinks) as string);
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
