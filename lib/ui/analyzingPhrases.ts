import type { AppMode } from "@/lib/welcomeMessages";

export type AnalyzingKey =
  | "generic"
  | "aiDoc"
  | "clinical"
  | "clinicalResearch"
  | "wellness"
  | "wellnessResearch";

const MAX_PHRASES = 3;

function samplePhrases(source: readonly string[], count: number) {
  if (!source.length) return [] as string[];
  const limit = Math.min(count, source.length);
  const picks = new Set<number>();
  while (picks.size < limit) {
    const idx = Math.floor(Math.random() * source.length);
    picks.add(idx);
    if (picks.size === source.length) break;
  }
  return Array.from(picks).map(index => source[index]);
}

export async function loadAnalyzingPhrases(
  key: AnalyzingKey,
  count: number = MAX_PHRASES,
): Promise<string[]> {
  const lib = await import("./analyzingLibrary");
  const fallback = lib.genericAnalyzing;
  let pool: readonly string[] | undefined;
  switch (key) {
    case "aiDoc":
      pool = lib.aiDocAnalyzing;
      break;
    case "clinical":
      pool = lib.clinicalAnalyzing;
      break;
    case "clinicalResearch":
      pool = lib.clinicalResearchAnalyzing;
      break;
    case "wellness":
      pool = lib.wellnessAnalyzing;
      break;
    case "wellnessResearch":
      pool = lib.wellnessResearchAnalyzing;
      break;
    default:
      pool = fallback;
      break;
  }
  const source = pool && pool.length > 0 ? pool : fallback;
  const phrases = samplePhrases(source, Math.max(1, count));
  return phrases.length > 0 ? phrases : samplePhrases(fallback, Math.max(1, count));
}

export function analyzingKeyForMode(mode: AppMode, research: boolean): AnalyzingKey {
  if (mode === "aidoc") return "aiDoc";
  if (mode === "clinical") return research ? "clinicalResearch" : "clinical";
  if (mode === "therapy") return research ? "wellnessResearch" : "wellness";
  if (mode === "wellness") return research ? "wellnessResearch" : "wellness";
  return "generic";
}
