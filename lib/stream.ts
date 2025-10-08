export type StreamReq = {
  system: string;
  user: string;
  max_tokens?: number;
  temperature?: number;
};

export type StreamHandlers = {
  onToken: (chunk: string) => void;
  onDone?: () => void;
  onError?: (err: unknown) => void;
};

export async function streamChat(
  req: StreamReq,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal
  });
  if (!res.ok || !res.body) {
    throw new Error("Chat stream failed");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const read = await reader.read();
      if (read.done) break;
      if (read.value) {
        const text = decoder.decode(read.value, { stream: true });
        handlers.onToken(text);
      }
    }
    if (handlers.onDone) handlers.onDone();
  } catch (err) {
    if (handlers.onError) handlers.onError(err);
    throw err;
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}
