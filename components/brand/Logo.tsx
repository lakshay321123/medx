// components/brand/Logo.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import {
  BRAND_NAME,
  LOGO_SRC,
  LOGO_FALLBACKS,
  LOGO_WHITE_SRC,
  LOGO_WHITE_FALLBACKS,
} from "@/lib/brand";

/**
 * Robust Logo component:
 * - Tries LOGO_SRC first
 * - On 404/error, walks through LOGO_FALLBACKS automatically
 * - If all fail, shows brand name text (so you never see a broken image)
 */
type LogoVariant = "default" | "white";

export default function Logo({
  width = 160,
  height = 48,
  className = "",
  variant = "default",
}: {
  width?: number;
  height?: number;
  className?: string;
  variant?: LogoVariant;
}) {
  const defaultSources = React.useMemo(() => [LOGO_SRC, ...LOGO_FALLBACKS], []);
  const whiteSources = React.useMemo(
    () => [LOGO_WHITE_SRC, ...LOGO_WHITE_FALLBACKS, ...defaultSources],
    [defaultSources],
  );
  const sources = variant === "white" ? whiteSources : defaultSources;
  const [idx, setIdx] = React.useState(0);
  const [showText, setShowText] = React.useState(false);

  React.useEffect(() => {
    setIdx(0);
    setShowText(false);
  }, [sources]);

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
        <Image
          key={src} // force re-render on src change
          src={src}
          alt={BRAND_NAME}
          width={width}
          height={height}
          priority
          className="block select-none"
          onError={handleError}
        />
      )}
    </Link>
  );
}
