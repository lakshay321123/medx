import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  title?: string;
  active?: boolean;
};

export function Glyph({ title = "Icon", active = false, children, style, ...rest }: IconProps) {
  const strokeWidth = active ? 2.0 : 1.75;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      style={{ transition: "opacity 0.15s ease, stroke-width 0.15s ease", ...style }}
      {...rest}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}
