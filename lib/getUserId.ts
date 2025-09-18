import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

/** Returns NextAuth user id, or MEDX_TEST_USER_ID if not logged in. */
export async function getUserId(_req?: NextRequest): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    const id = (session?.user as { id?: string } | undefined)?.id ?? null;
    if (id) return id;
  } catch {
    // ignore and fall back to env-based id
  }
  const envId = process.env.MEDX_TEST_USER_ID || process.env.NEXT_PUBLIC_TEST_USER_ID || '';
  if (envId) return envId;
  console.warn('[medx] No user id. Set MEDX_TEST_USER_ID in environment for Ai Doc.');
  return null as any;
}
