const AIDOC_MATCH = /ai[\s_-]*doc/;

function normalizeAidocCandidate(lower: string): string | null {
  if (!lower) return null;
  const compact = lower.replace(/[^a-z0-9]/g, "");
  if (!compact) return null;
  if (compact.includes("aidoc")) return "aidoc";
  if (compact.startsWith("docai")) return "aidoc";
  if (compact.startsWith("docmode")) return "aidoc";
  if (compact.startsWith("aidocmode")) return "aidoc";
  return null;
}

export function normalizeAidocThreadType(input: unknown): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const direct = normalizeAidocCandidate(lower);
  if (direct) return direct;
  if (AIDOC_MATCH.test(lower)) {
    return "aidoc";
  }
  return lower;
}

let loggedLookupError = false;

export async function resolveAidocThreadType(params: {
  explicitType?: unknown;
  context?: unknown;
  mode?: unknown;
  threadId?: unknown;
}): Promise<string | null> {
  const explicit = normalizeAidocThreadType(params.explicitType);
  if (explicit) return explicit;

  const fromMode = normalizeAidocThreadType(params.mode);
  if (fromMode) return fromMode;

  const fromContext = normalizeAidocThreadType(params.context);
  if (fromContext) return fromContext;

  const threadId = typeof params.threadId === "string" && params.threadId.trim() ? params.threadId.trim() : null;
  if (!threadId) return null;

  try {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const client = supabaseAdmin();
    const tables = ["chat_threads", "aidoc_threads"];

    for (const table of tables) {
      const query = client
        .from(table)
        .select("type")
        .eq("id", threadId)
        .maybeSingle();
      const { data, error } = await query;
      if (error) {
        // Ignore missing table errors; log others once for observability.
        const code = (error as { code?: string }).code;
        const missingTable = code === "42P01";
        if (!missingTable && !loggedLookupError) {
          loggedLookupError = true;
          console.error("[aidoc-labs] thread type lookup failed", error);
        }
        continue;
      }
      if (data && typeof data.type === "string") {
        const normalized = normalizeAidocThreadType(data.type);
        if (normalized) {
          return normalized;
        }
      }
    }
  } catch (err) {
    if (!loggedLookupError) {
      loggedLookupError = true;
      console.error("[aidoc-labs] thread type resolve error", err);
    }
  }

  return null;
}
