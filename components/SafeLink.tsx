"use client";

import React from "react";
import { sourceLabelFromUrl } from "@/lib/url";

const REWRITE_MAP: Record<string, string> = {
  "https://www.cms.gov/medicare/coding/place-of-service-codes/place-service-code-set":
    "https://www.cms.gov/medicare/coding-billing/place-of-service-codes/code-sets",
  "http://www.cms.gov/medicare/coding/place-of-service-codes/place-service-code-set":
    "https://www.cms.gov/medicare/coding-billing/place-of-service-codes/code-sets",
};

export function normalizeExternalHref(input?: string): string | null {
  if (!input) return null;
  let href = input.trim();
  if (!href) return null;

  // If model returned "[Learn more](www.nhs.uk/)" (no protocol), add https
  if (/^www\./i.test(href)) href = "https://" + href;

  if (REWRITE_MAP[href]) href = REWRITE_MAP[href];

  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://example.org";
    const url = new URL(href, base);

    const scheme = url.protocol.replace(":", "").toLowerCase();
    if (!["http", "https"].includes(scheme)) return null;

    return url.toString();
  } catch {
    return null;
  }
}

export const SafeAnchor: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href, children, ...rest }) => {
  const safe = normalizeExternalHref(href);
  if (!safe) {
    return (
      <span
        className="text-slate-500 dark:text-slate-400 cursor-not-allowed"
        title="Link unavailable"
      >
        {children}
      </span>
    );
  }
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 decoration-slate-400 hover:decoration-slate-600 dark:decoration-slate-500 dark:hover:decoration-slate-300"
      {...rest}
    >
      {children}
    </a>
  );
};

type LinkVerdict = "alive" | "dead" | "uncertain";

const verdictMemory = new Map<string, LinkVerdict>();
const inflightChecks = new Map<string, Promise<LinkVerdict>>();

function storageKey(url: string) {
  return `linkcheck:${url}`;
}

function rememberVerdict(url: string, verdict: LinkVerdict) {
  verdictMemory.set(url, verdict);
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(storageKey(url), verdict);
  } catch {
    // ignore storage errors
  }
}

function readCachedVerdict(url: string): LinkVerdict | null {
  if (verdictMemory.has(url)) {
    return verdictMemory.get(url)!;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const cached = window.sessionStorage.getItem(storageKey(url));
    if (cached === "alive" || cached === "dead" || cached === "uncertain") {
      verdictMemory.set(url, cached);
      return cached;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

async function ensureLinkVerdict(url: string): Promise<LinkVerdict> {
  const cached = readCachedVerdict(url);
  if (cached) {
    return cached;
  }

  if (typeof window === "undefined") {
    return "uncertain";
  }

  const pending = inflightChecks.get(url);
  if (pending) {
    return pending;
  }

  const request: Promise<LinkVerdict> = (async () => {
    try {
      const response = await fetch("/api/linkcheck", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await response.json();
      const verdict: LinkVerdict =
        json?.verdict === "dead" || json?.verdict === "alive" ? json.verdict : "uncertain";
      rememberVerdict(url, verdict);
      return verdict;
    } catch {
      rememberVerdict(url, "uncertain");
      return "uncertain";
    } finally {
      inflightChecks.delete(url);
    }
  })();

  inflightChecks.set(url, request);
  return request;
}

export function LinkBadge(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href, children, className = "", ...rest } = props;
  const safe = normalizeExternalHref(typeof href === "string" ? href : undefined);
  const [verdict, setVerdict] = React.useState<LinkVerdict | null>(() => {
    if (!safe) {
      return "dead";
    }
    if (typeof window === "undefined") {
      return "uncertain";
    }
    return readCachedVerdict(safe);
  });

  React.useEffect(() => {
    let mounted = true;
    if (!safe) {
      setVerdict("dead");
      return () => {
        mounted = false;
      };
    }

    if (typeof window === "undefined") {
      setVerdict("uncertain");
      return () => {
        mounted = false;
      };
    }

    const cached = readCachedVerdict(safe);
    if (cached) {
      setVerdict(cached);
      return () => {
        mounted = false;
      };
    }

    setVerdict((previous) => {
      if (previous && previous !== "dead") {
        return previous;
      }
      return "uncertain";
    });

    ensureLinkVerdict(safe)
      .then((v) => {
        if (mounted) {
          setVerdict(v);
        }
      })
      .catch(() => {
        if (mounted) {
          setVerdict("uncertain");
        }
      });

    return () => {
      mounted = false;
    };
  }, [safe]);

  const label = React.useMemo(() => {
    if (typeof children === "string" && children.trim().length > 0) {
      return children;
    }
    if (safe) {
      return sourceLabelFromUrl(safe);
    }
    return children ?? "Source";
  }, [children, safe]);

  if (!safe || verdict === "dead") {
    const disabledClass =
      "inline-flex items-center rounded-full border px-2 py-1 text-xs opacity-70 cursor-not-allowed " +
      "border-slate-200 dark:border-gray-700 text-slate-400" +
      (className ? " " + className : "");
    return (
      <span className={disabledClass} title="Link unavailable">
        {label}
      </span>
    );
  }

  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      aria-busy={verdict === null ? "true" : "false"}
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-gray-800 transition " +
        "border-slate-200 dark:border-gray-700" +
        (className ? " " + className : "")
      }
      {...rest}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="opacity-70">
        ↗
      </span>
    </a>
  );
}

