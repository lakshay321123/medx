import * as React from "react";

export type IconProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
  /** Stroke weight when not active (default 1.5) */
  weight?: number;
  /** Stroke weight when active (default 1.9) */
  activeWeight?: number;
  /** Toggle thicker stroke + full opacity */
  active?: boolean;
  /** Size in px (CSS should usually control, default 20) */
  size?: number;
};

export const Glyph = React.forwardRef<SVGSVGElement, IconProps>(
  (
    {
      title = "Icon",
      active = false,
      weight = 1.5,
      activeWeight = 1.9,
      size = 20,
      children,
      ...rest
    },
    ref
  ) => {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        role="img"
        aria-label={title}
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? activeWeight : weight}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          opacity: active ? 1 : 0.72,
          transition: "opacity .15s ease, stroke-width .15s ease",
        }}
        {...rest}
      >
        {children}
      </svg>
    );
  }
);
Glyph.displayName = "Glyph";
