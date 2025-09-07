import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

/** Returns NextAuth user id, or MEDX_TEST_USER_ID if not logged in. */
export async function getUserId(_req?: NextRequest): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    const id = (session?.user as { id?: string } | undefined)?.id ?? null;
    return id ?? process.env.MEDX_TEST_USER_ID ?? null;
  } catch {
    return process.env.MEDX_TEST_USER_ID ?? null;
  }
}
