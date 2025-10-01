import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string; active?: boolean };

export function Glyph({ title = "Icon", active = false, ...rest }: IconProps) {
  const ariaHidden = rest["aria-hidden"] === true || rest["aria-hidden"] === "true";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 1.9 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={ariaHidden ? undefined : title}
      focusable="false"
      {...rest}
    />
  );
}

export type { IconProps };
