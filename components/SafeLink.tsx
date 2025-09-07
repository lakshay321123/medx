import React from "react";

const ALLOW = [
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "cancer.gov",
  "who.int",
  "cdc.gov",
  "nhs.uk",
  "mayoclinic.org",
  "uptodate.com",
];

export function normalizeExternalHref(input?: string): string | null {
  if (!input) return null;
  let href = input.trim();

  // If model returned "[Learn more](www.nhs.uk/)" (no protocol), add https
  if (/^www\./i.test(href)) href = "https://" + href;

  // If relative or missing protocol → invalid
  if (!/^https?:\/\//i.test(href)) return null;

  try {
    const url = new URL(href);
    // encode spaces etc.
    url.pathname = url.pathname.split("/").map(encodeURIComponent).join("/");
    const hostOk = ALLOW.some(
      d => url.hostname === d || url.hostname.endsWith(`.${d}`)
    );
    if (!hostOk) return null;
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

