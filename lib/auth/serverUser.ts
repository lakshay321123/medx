import { NextRequest } from "next/server";

/**
 * Minimal server-side helper to resolve the current user ID.
 * Reads `x-user-id` header if present; falls back to `MEDX_TEST_USER_ID` in dev only.
 */
export async function getServerUserId(req?: NextRequest): Promise<string | null> {
  const hdr = req?.headers.get("x-user-id");
  if (hdr) return hdr;
  // Only allow test fallback in development
  if (process.env.NODE_ENV !== "production") {
    return process.env.MEDX_TEST_USER_ID || null;
  }
  return null;
}
