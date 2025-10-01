import { mapDraftToThreadMode, type DraftMode } from "./types";

export async function createThreadIfNeeded({
  threadId,
  mode,
  research,
  titleHint,
}: {
  threadId: string | null;
  mode: DraftMode;
  research?: boolean;
  titleHint?: string;
}): Promise<string> {
  if (threadId) return threadId;
  try {
    const res = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: mapDraftToThreadMode(mode),
        research: !!research,
        titleHint: titleHint ?? "New chat",
      }),
    });

    if (!res.ok) {
      console.error(`Failed to create thread: ${res.status} ${res.statusText}`);
      return crypto.randomUUID();
    }

    try {
      const json = await res.json();
      const id = typeof json?.id === "string" ? json.id : null;
      if (id) return id;
    } catch {
      console.error("Failed to parse thread creation response");
    }
  } catch (error) {
    console.error("Network error creating thread:", error);
  }
  return crypto.randomUUID();
}
