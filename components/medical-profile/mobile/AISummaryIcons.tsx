"use client";

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function buildClassName(className?: string) {
  const base = "h-5 w-5 stroke-current text-slate-500 dark:text-slate-300";
  return className ? `${base} ${className}` : base;
}

export function IconUser({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className={buildClassName(className)} {...props}>
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21c0-3.314 3.134-6 7-6s7 2.686 7 6" />
    </svg>
  );
}

export function IconDna({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className={buildClassName(className)} {...props}>
      <path d="M7 3c3.5 3.5 6.5 3.5 10 0" />
      <path d="M7 21c3.5-3.5 6.5-3.5 10 0" />
      <path d="M7 7h10" />
      <path d="M7 17h10" />
      <path d="M9 9c2 2 4 2 6 0" />
      <path d="M9 15c2-2 4-2 6 0" />
    </svg>
  );
}

export function IconUsers({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className={buildClassName(className)} {...props}>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="3" />
      <path d="M4 21c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <path d="M13 21c0-2.8 2-5 4.5-5 1.2 0 2.3.4 3.2 1" />
    </svg>
  );
}

export function IconPill({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className={buildClassName(className)} {...props}>
      <path d="M8.5 8.5 4 13c-2 2-2 5.5 0 7.5s5.5 2 7.5 0l4.5-4.5c2-2 2-5.5 0-7.5s-5.5-2-7.5 0Z" />
      <path d="M9.5 14.5 14.5 9.5" />
    </svg>
  );
}

export function IconFlask({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className={buildClassName(className)} {...props}>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L5.6 18c-1.1 1.9.2 4 2.4 4h8c2.2 0 3.5-2.1 2.4-4L14 9.5V3" />
      <path d="M8 14h8" />
    </svg>
  );
}

export function IconBot({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className={buildClassName(className)} {...props}>
      <rect x="5" y="9" width="14" height="10" rx="3" />
      <path d="M12 5V3" />
      <circle cx="9" cy="14" r="1" />
      <circle cx="15" cy="14" r="1" />
      <path d="M8 5h8" />
    </svg>
  );
}

export function IconNote({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className={buildClassName(className)} {...props}>
      <path d="M6 3h9l3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
      <path d="M15 3v3h3" />
    </svg>
  );
}

export function IconCheck({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className={buildClassName(className)} {...props}>
      <path d="m5 13 4 4L19 7" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
