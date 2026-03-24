import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

/** Returns NextAuth user id. Falls back to MEDX_TEST_USER_ID in dev only. */
export async function getUserId(_req?: NextRequest): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    const id = (session?.user as { id?: string } | undefined)?.id ?? null;
    if (id) return id;
  } catch {
    // Ignore auth errors; rely on fallback below.
  }

  // Only allow test user fallback in development — never in production
  if (process.env.NODE_ENV !== "production") {
    return process.env.MEDX_TEST_USER_ID
      ?? process.env.NEXT_PUBLIC_MEDX_TEST_USER_ID
      ?? null;
  }

  return null;
}
