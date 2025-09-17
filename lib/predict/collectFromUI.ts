import type { PredictionBundle, UITextChunk } from "./types";

// This shim accepts whatever your panels/selectors already expose.
// Pass those objects in; do NOT fetch again. If something is missing, return minimal.
export function buildPredictionBundle(input: {
  profile?: any;
  observations?: any[];
  labs?: any[];
  meds?: any[];
  textChunks?: { file_id: string; page: number; chunk_index: number; content: string }[]; // as your UI uses
}): PredictionBundle {
  const chunks: UITextChunk[] =
    (input.textChunks || []).slice(0, 600).map(c => ({
      ref: `${c.file_id}:${c.page}:${c.chunk_index}`,
      text: c.content || ""
    }));

  return {
    profile: input.profile || null,
    observations: input.observations || [],
    labs: input.labs || [],
    meds: input.meds || [],
    chunks
  };
}
