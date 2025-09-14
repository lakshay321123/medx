'use client';
import React from 'react';
import ChatMarkdown from '@/components/ChatMarkdown';

type Props = { text?: string; children?: React.ReactNode };

function childrenToString(children: React.ReactNode): string {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(childrenToString).join('');
  if (typeof children === 'number' || typeof children === 'boolean') return String(children);
  // Fallback
  // @ts-ignore
  return String(children ?? '');
}

export default function Markdown({ text, children }: Props) {
  const content = text ?? childrenToString(children);
  return <ChatMarkdown content={content} />;
}

