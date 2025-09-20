import React from "react";
import { sourceLabelFromUrl } from "@/lib/url";

export function normalizeExternalHref(input?: string): string | null {
  if (!input) return null;
  let href = input.trim();
  if (!href) return null;

  // If model returned "[Learn more](www.nhs.uk/)" (no protocol), add https
  if (/^www\./i.test(href)) href = "https://" + href;

  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://example.org";
    const url = new URL(href, base);

    // allow only http/https, block javascript:, data:, etc.
    if (!/^https?:$/i.test(url.protocol)) return null;

    // encode spaces etc. (path segments only)
    url.pathname = url.pathname.split("/").map(encodeURIComponent).join("/");
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
  if (!safe) {
    return (
      <span
        className="inline-flex items-center rounded-full border border-slate-200 dark:border-gray-700 px-2 py-1 text-xs text-slate-400"
        title="Link unavailable"
      >
        {children ?? "Source"}
      </span>
    );
  }

  // Use provided text if present; otherwise show derived source label
  const label =
    (typeof children === "string" && children.trim().length > 0)
      ? children
      : sourceLabelFromUrl(safe);

  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-gray-700 " +
        "bg-white dark:bg-gray-900 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 " +
        "shadow-sm hover:bg-slate-50 dark:hover:bg-gray-800 transition " + className
      }
      {...rest}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="opacity-70">↗</span>
    </a>
  );
}

