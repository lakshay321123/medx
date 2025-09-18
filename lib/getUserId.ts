import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

/** Returns NextAuth user id, or MEDX_TEST_USER_ID if not logged in. */
export async function getUserId(_req?: NextRequest): Promise<string | null> {
  const fallback = () =>
    process.env.MEDX_TEST_USER_ID
    ?? process.env.NEXT_PUBLIC_MEDX_TEST_USER_ID
    ?? null;

  try {
    const session = await getServerSession(authOptions);
    const id = (session?.user as { id?: string } | undefined)?.id ?? null;
    if (id) return id;
  } catch {
    // Ignore auth errors; rely on fallback below.
  }

  return fallback();
}
