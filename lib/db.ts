import { supabaseAdmin } from "@/lib/supabase/admin";

export function db() {
  return supabaseAdmin();
}
