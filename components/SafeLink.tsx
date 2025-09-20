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

export function LinkBadge(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href, children, className = "", ...rest } = props;
  const safe = normalizeExternalHref(typeof href === "string" ? href : undefined);
  const [ok, setOk] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;
    if (!safe) {
      setOk(false);
      return () => {
        mounted = false;
      };
    }
    setOk(null);
    (async () => {
      try {
        const response = await fetch("/api/linkcheck", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: safe }),
        });
        const json = await response.json();
        if (mounted) setOk(Boolean(json.ok));
      } catch {
        if (mounted) setOk(false);
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

  if (!safe || ok === false) {
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
      aria-busy={ok === null ? "true" : "false"}
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

