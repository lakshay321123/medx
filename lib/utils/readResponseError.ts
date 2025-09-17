export async function readResponseError(res: Response, fallback: string): Promise<string> {
  const base = res.statusText?.trim() || fallback;
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const data = await res.clone().json() as { error?: unknown; message?: unknown };
      const message =
        typeof data?.error === "string"
          ? data.error
          : typeof data?.message === "string"
          ? data.message
          : null;
      if (message?.trim()) {
        return message.trim();
      }
    } catch (error) {
      // ignore JSON parsing issues and fall back to the next strategy
    }
  }

  try {
    const text = await res.clone().text();
    const trimmed = text.trim();
    if (trimmed) {
      return trimmed;
    }
  } catch (error) {
    // ignore text parsing issues and fall back to the base message
  }

  return base;
}
