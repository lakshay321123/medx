import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns Supabase Auth user id (uuid) if logged in.
 * Falls back to MEDX_TEST_USER_ID / NEXT_PUBLIC_MEDX_TEST_USER_ID for dev.
 */
export async function getUserId(_req?: NextRequest): Promise<string | null> {
  const fallback =
    process.env.MEDX_TEST_USER_ID ??
    process.env.NEXT_PUBLIC_MEDX_TEST_USER_ID ??
    null;

  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const id = data?.user?.id ?? null;
    if (id) return id;
  } catch {
    // ignore; use fallback
  }

  return fallback;
}
