"use client";

/**
 * Opinion Labs — SVG typographic logo
 * Uses a geometric sans-serif style distinct from Inter body font.
 * "opinion" in light weight, "labs" in bold teal.
 */
export default function OpinionLabsLogo({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const scale = size === "small" ? 0.75 : size === "large" ? 1.3 : 1;
  const w = Math.round(160 * scale);
  const h = Math.round(28 * scale);

  return (
    <svg
      viewBox="0 0 160 28"
      width={w}
      height={h}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Opinion Labs"
      role="img"
    >
      {/* "opinion labs" as single line, tight spacing */}
      <text
        x="0"
        y="21"
        fontFamily="'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif"
        fontSize="22"
        letterSpacing="-0.5"
        fill="currentColor"
      >
        <tspan fontWeight="300">opinion</tspan>
        <tspan fontWeight="700" fill="#06B6D4" dx="4">labs</tspan>
      </text>
    </svg>
  );
}
