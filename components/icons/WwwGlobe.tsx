import type { SVGProps } from "react";

export default function WwwGlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.75 9.5a8.7 8.7 0 0 1 10.5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
      <path
        d="M5.5 12h13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
      <path
        d="M7.4 14.7l1.02-3.1h.86l.97 2.65.95-2.65h.86l.98 2.67.95-2.67h.86l1.02 3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
