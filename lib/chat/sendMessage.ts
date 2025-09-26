"use client";

export type SendMessageOptions = {
  visualEcho?: boolean;
  clientRequestId?: string;
};

type Detail = {
  text: string;
  opts?: SendMessageOptions;
};

/**
 * Dispatches a chat send event so the ChatPane can enqueue the message.
 */
export function sendMessage(text: string, opts?: SendMessageOptions) {
  if (typeof window === "undefined") return;
  if (!text || !text.trim()) return;
  const detail: Detail = { text, opts };
  window.dispatchEvent(new CustomEvent<Detail>("medx:chat:send", { detail }));
}
