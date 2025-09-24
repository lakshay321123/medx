import { createClient } from "@supabase/supabase-js";

// ⚠️ Never import this from a "use client" file.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    throw new Error(`Supabase admin env vars missing: ${missing.join(", ") || "unknown"}`);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
