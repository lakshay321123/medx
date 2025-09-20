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

export const SafeAnchor: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({
  href,
  children,
  className = "",
  ...rest
}) => {
  const safe = normalizeExternalHref(href);
  if (!safe) {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-gray-200 dark:bg-slate-800 px-2 py-1 text-xs text-gray-500 cursor-not-allowed ${className}`.trim()}
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
      className={`inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-medium text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition ${className}`.trim()}
      {...rest}
    >
      {children}
      <span aria-hidden className="opacity-70">
        ↗
      </span>
    </a>
  );
};

export function LinkBadge(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href, children, className = "", ...rest } = props;
  const safe = normalizeExternalHref(typeof href === "string" ? href : undefined);
  const [verdict, setVerdict] = React.useState<"alive" | "dead" | "uncertain" | null>(null);

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

    const key = `linkcheck:${safe}`;
    try {
      const cached = window.sessionStorage.getItem(key);
      if (cached === "alive" || cached === "dead" || cached === "uncertain") {
        setVerdict(cached as "alive" | "dead" | "uncertain");
        return () => {
          mounted = false;
        };
      }
    } catch {
      // ignore storage errors
    }

    setVerdict(null);

    (async () => {
      try {
        const response = await fetch("/api/linkcheck", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: safe }),
        });
        const json = await response.json();
        const v: "alive" | "dead" | "uncertain" =
          json?.verdict === "dead" || json?.verdict === "alive" ? json.verdict : "uncertain";
        if (mounted) {
          setVerdict(v);
        }
        try {
          window.sessionStorage.setItem(key, v);
        } catch {
          // ignore storage failures
        }
      } catch {
        if (mounted) {
          setVerdict("uncertain");
        }
      }
    })();

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
      "inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-gray-200 dark:bg-slate-800 px-2 py-1 text-xs text-gray-500 cursor-not-allowed " +
      (className ? className : "");
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
      className={`inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-medium text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition ${className}`.trim()}
      {...rest}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="opacity-70">
        ↗
      </span>
    </a>
  );
}

