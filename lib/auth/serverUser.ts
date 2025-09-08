import { NextRequest } from "next/server";

/**
 * Minimal server-side helper to resolve the current user ID.
 * Reads `x-user-id` header if present; falls back to `MEDX_TEST_USER_ID`.
 */
export async function getServerUserId(req?: NextRequest): Promise<string | null> {
  const hdr = req?.headers.get("x-user-id");
  return hdr || process.env.MEDX_TEST_USER_ID || null;
}
