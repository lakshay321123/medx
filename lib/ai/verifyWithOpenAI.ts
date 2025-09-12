import { VERIFY_SYSTEM, buildVerifyUserContent } from "./verify_prompt";

type Verdict = {
  ok: boolean;
  version: string;
  corrected_values?: Record<string, any>;
  corrections?: string[];
  final_assertions?: Record<string, any>;
};

function timeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("verify-timeout")), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

export async function verifyWithOpenAI(args: {
  mode: string;
  ctx: Record<string, any>;
  computed: Array<any>;
  signal?: AbortSignal;
  timeoutMs?: number;    // default 10_000
  cacheGet?: (key: string) => Verdict | undefined;
  cacheSet?: (key: string, v: Verdict, ttlMs: number) => void;
  cacheKey: string;
}): Promise<Verdict | null> {
  const { mode, ctx, computed, signal, timeoutMs = 10_000, cacheGet, cacheSet, cacheKey } = args;

  // cache
  if (cacheGet) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }

  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL_ID || "gpt-5";
  const key = process.env.OPENAI_API_KEY!;
  const url = `${base.replace(/\/$/, '')}/chat/completions`;

  const body = {
    model,
    temperature: 0,
    top_p: 1,
    messages: [
      { role: "system", content: VERIFY_SYSTEM },
      { role: "user", content: buildVerifyUserContent({ mode, ctx, computed }) }
    ],
    response_format: { type: "json_object" },
    stream: false
  };

  try {
    const res = await timeout(fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify(body),
      signal
    }), timeoutMs);

    if (!("ok" in res) || !(res as any).ok) return null;
    const data = await (res as Response).json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    let parsed: Verdict | null = null;
    try {
      parsed = JSON.parse(content);
    } catch { return null; }

    // minimal sanity
    if (!parsed || parsed.version !== "v1") return null;
    if (cacheSet) cacheSet(cacheKey, parsed, 10 * 60 * 1000); // 10 minutes
    return parsed;
  } catch {
    return null; // silent fallback
  }
}
