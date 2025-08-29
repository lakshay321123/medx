'use client';

export default function Markdown({ children }: { children: string }) {
  return <div style={{ whiteSpace: 'pre-wrap' }}>{children}</div>;
}
