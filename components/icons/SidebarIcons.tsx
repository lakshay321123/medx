import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
  title?: string;
};

export function IconNewChat({
  size = 24,
  strokeWidth = 1.75,
  title = "New Chat",
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <title>{title}</title>
      <rect x="3" y="4" width="18" height="14" rx="3" />
      <polyline points="8 18 8 22 12 19.5" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="10" y1="11" x2="14" y2="11" />
    </svg>
  );
}

export function IconDirectory({
  size = 24,
  strokeWidth = 1.75,
  title = "Directory",
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <title>{title}</title>
      <line x1="4" y1="7" x2="11" y2="7" />
      <line x1="4" y1="11" x2="11" y2="11" />
      <line x1="4" y1="15" x2="9" y2="15" />
      <circle cx="16.5" cy="10" r="2.75" />
      <path d="M16.5 13.5c0 2.2 3 3.2 3 5 0 .8-.7 1.5-1.5 1.5h-3c-.8 0-1.5-.7-1.5-1.5 0-1.8 3-2.8 3-5Z" />
    </svg>
  );
}

export function IconMedicalProfile({
  size = 24,
  strokeWidth = 1.75,
  title = "Medical Profile",
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <title>{title}</title>
      <path d="M7 3h7l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <polyline points="14 3 14 7 18 7" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="12" y1="9" x2="12" y2="15" />
    </svg>
  );
}

export function IconTimeline({
  size = 24,
  strokeWidth = 1.75,
  title = "Timeline",
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <title>{title}</title>
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  );
}
