export async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: res.ok, raw: text } as any;
  }
}

export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: fd // DO NOT set Content-Type manually
  });

  const data = await safeJson(res);
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Upload failed (${res.status})`);
  }
  return data;
}
