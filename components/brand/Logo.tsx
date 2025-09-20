// components/brand/Logo.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { BRAND_NAME, LOGO_SRC, LOGO_FALLBACKS } from "@/lib/brand";

/**
 * Robust Logo component:
 * - Tries LOGO_SRC first
 * - On 404/error, walks through LOGO_FALLBACKS automatically
 * - If all fail, shows brand name text (so you never see a broken image)
 */
export default function Logo({
  width = 200,
  height = 50,
  className = "",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const sources = React.useMemo(() => [LOGO_SRC, ...LOGO_FALLBACKS], []);
  const [idx, setIdx] = React.useState(0);
  const [showText, setShowText] = React.useState(false);

  const src = sources[idx] ?? null;

  const handleError = () => {
    const next = idx + 1;
    if (next < sources.length) {
      setIdx(next);
    } else {
      setShowText(true);
    }
  };

  return (
    <Link
      href="/"
      aria-label={`${BRAND_NAME} — Home`}
      className={`inline-flex items-center gap-2 shrink-0 ${className}`}
    >
      {showText || !src ? (
        <span className="font-semibold tracking-tight">{BRAND_NAME}</span>
      ) : (
        <div className="top-panel-logo">
          <Image
            key={src} // force re-render on src change
            src={src}
            alt={BRAND_NAME}
            width={width}
            height={height}
            priority
            className="logo-img select-none"
            onError={handleError}
          />
        </div>
      )}
    </Link>
  );
}
