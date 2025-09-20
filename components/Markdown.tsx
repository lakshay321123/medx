'use client';
import React from "react";
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { sourceLabelFromUrl } from "@/lib/url";
import { normalizeExternalHref } from './SafeLink';
import { linkify } from './AutoLink';

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

    return `<a href="${safe}" target="_blank" rel="noopener noreferrer" data-guard-link="1"
    class="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-gray-700 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-gray-800 transition">
      <span>${useLabel}</span><span aria-hidden="true" class="opacity-70">↗</span>
  </a>`;
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[data-guard-link="1"]')
    );
    if (!anchors.length) return;

    let disposed = false;

    const disableAnchor = (anchor: HTMLAnchorElement) => {
      if (disposed) return;
      const replacement = Object.assign(document.createElement("span"), {
        className: anchor.className + " opacity-70 cursor-not-allowed",
        title: "Link unavailable",
        innerHTML: anchor.innerHTML,
      });
      anchor.replaceWith(replacement);
    };

    let session: Storage | null = null;
    try {
      session = window.sessionStorage;
    } catch {
      session = null;
    }

    const readCache = (url: string) => {
      if (!session) return null;
      try {
        const cached = session.getItem(`linkcheck:${url}`);
        if (cached === "alive" || cached === "dead" || cached === "uncertain") {
          return cached as "alive" | "dead" | "uncertain";
        }
      } catch {
        // ignore cache issues
      }
      return null;
    };
    const writeCache = (url: string, value: "alive" | "dead" | "uncertain") => {
      if (!session) return;
      try {
        session.setItem(`linkcheck:${url}`, value);
      } catch {
        // ignore cache issues
      }
    };

    const maxConcurrent = 6;
    const queue: Array<() => Promise<void>> = [];
    let active = 0;

    const runNext = () => {
      if (disposed) return;
      if (active >= maxConcurrent) return;
      const task = queue.shift();
      if (!task) return;
      active += 1;
      task()
        .catch(() => {})
        .finally(() => {
          active -= 1;
          runNext();
        });
    };

    const enqueue = (task: () => Promise<void>) => {
      queue.push(task);
      runNext();
    };

    const processAnchor = async (anchor: HTMLAnchorElement) => {
      if (disposed) return;
      const url = anchor.href;
      let verdict = readCache(url);
      if (verdict === "dead") {
        disableAnchor(anchor);
        return;
      }
      if (verdict === "alive" || verdict === "uncertain") {
        return;
      }

      try {
        const response = await fetch("/api/linkcheck", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const json = await response.json();
        verdict =
          json?.verdict === "dead" || json?.verdict === "alive"
            ? (json.verdict as "dead" | "alive")
            : "uncertain";
        writeCache(url, verdict);
      } catch {
        verdict = "uncertain";
        writeCache(url, verdict);
      }

      if (disposed) return;
      if (verdict === "dead") {
        disableAnchor(anchor);
      }
    };

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const anchor = entry.target as HTMLAnchorElement;
            observer?.unobserve(anchor);
            enqueue(() => processAnchor(anchor));
          });
        },
        { rootMargin: "128px" }
      );
    }

    anchors.forEach((anchor) => {
      if (anchor.dataset.guardProcessed === "1") return;
      anchor.dataset.guardProcessed = "1";
      const cached = readCache(anchor.href);
      if (cached === "dead") {
        disableAnchor(anchor);
        return;
      }
      if (cached === "alive" || cached === "uncertain") {
        return;
      }
      if (observer) {
        observer.observe(anchor);
      } else {
        enqueue(() => processAnchor(anchor));
      }
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      queue.length = 0;
    };
  }, [withSafeLinks]);
  return (
    <div
      className="markdown message-content"
      dangerouslySetInnerHTML={{ __html: withSafeLinks }}
    />
  );
}
