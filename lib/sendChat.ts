export async function sendChat(messages: Array<{role:'system'|'user'|'assistant'; content:string}>) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ messages })
  });

  // Always attempt JSON first
  let json: any;
  try {
    json = await res.json();
  } catch {
    // Read raw text for debugging, but return a nice error to UI
    const text = await res.text().catch(()=> '');
    return { ok: false, error: { code: 'bad_json', message: 'Upstream returned non-JSON', detail: text?.slice(0,200) } };
  }
  return json;
}
