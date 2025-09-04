import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton; do not throw at module load.
let _sb: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (_sb) return _sb;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Don't crash the bundle; log and create a harmless placeholder client.
    // Components should handle 401/invalid responses gracefully.
    if (typeof window !== "undefined") {
      console.error("Supabase env missing in client: check NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.");
    }
    // You could return a dummy client or throw _inside_ your fetchers instead.
  }

  _sb = createClient(url || "https://placeholder.supabase.co", anon || "placeholder");
  return _sb;
}
