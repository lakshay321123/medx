// lib/brand.ts
/**
 * Centralized brand settings.
 * LOGO_SRC is the canonical path we expect to exist in /public.
 * The Logo component will fall back to a few common variants if this 404s.
 */
export const BRAND_NAME = "Second Opinion";

// Canonical path you want to converge on (case-sensitive, recommended):
export const LOGO_SRC = "/brand/second-opinion.png";

// White variant used for dark or glass backgrounds on mobile.
export const LOGO_WHITE_SRC = "/Second-Opieee23423nion.png";
export const LOGO_WHITE_FALLBACKS: string[] = [
  "/brand/second-opinion-white.png",
  "/second-opinion-white.png",
  LOGO_SRC,
];

// Optional: alternate places/names you might currently have in /public.
// The Logo component will try these on onError in order.
export const LOGO_FALLBACKS: string[] = [
  "/Second-Opinion.png",
  "/brand/Second-Opinion.png",
  "/second-opinion.png",
  "/logo.png",
  "/logo.svg",
];
