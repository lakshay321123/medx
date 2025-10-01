export async function createThreadIfNeeded({
  threadId,
  mode,
  research,
  titleHint,
}: {
  threadId?: string | null;
  mode: "clinical" | "wellness" | "ai-doc";
  research?: boolean;
  titleHint?: string;
}): Promise<string> {
  if (threadId) return threadId;
  const res = await fetch("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, research, titleHint: titleHint ?? "New chat" }),
  });
  try {
    const json = await res.json();
    const id = typeof json?.id === "string" ? json.id : null;
    if (id) return id;
  } catch {
    // ignore JSON errors and fall back to client id
  }
  return crypto.randomUUID();
}
