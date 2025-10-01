"use client";

import { useCallback } from "react";
import { ListenButton } from "@/components/voice/ListenButton";
import { usePrefs } from "@/components/providers/PreferencesProvider";

export function getLatestAssistantText(): string {
  if (typeof document === "undefined") return "";

  const nodes = Array.from(
    document.querySelectorAll('[data-role="message"][data-author="assistant"]'),
  );
  const last = nodes[nodes.length - 1] as HTMLElement | undefined;
  if (last) {
    const body = last.querySelector('[data-part="content"]') as HTMLElement | null;
    const text = body?.innerText ?? last.innerText ?? "";
    return text.trim();
  }

  const bubbles = Array.from(document.querySelectorAll(".ai-bubble"));
  const fallback = bubbles[bubbles.length - 1] as HTMLElement | undefined;
  return (fallback?.innerText || "").trim();
}

export function ChatHeaderActions() {
  const { lang } = usePrefs();
  const getText = useCallback(() => getLatestAssistantText(), []);

  return (
    <div className="flex items-center gap-2">
      <ListenButton getText={getText} lang={lang} />
    </div>
  );
}
