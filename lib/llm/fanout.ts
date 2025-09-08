import { openai, modelFor, Tier } from "./openai";
type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function llmFanout(
  messages: Msg[],
  tiers: Tier[] = ["fast","smart"],   // race mini vs 5
  pick: "first" | "longest" | "json-valid" = "first",
  temperature = 0.2
) {
  const calls = tiers.map(async (t) => {
    const model = modelFor(t);
    try {
      const resp = await openai.chat.completions.create({ model, messages, temperature });
      const msg = resp.choices?.[0]?.message;
      return { tier: t, msg, error: null as any };
    } catch (error) {
      return { tier: t, msg: null as any, error };
    }
  });

  const results = await Promise.all(calls);

  if (pick === "first") {
    const firstOk = results.find(r => r.msg?.content);
    if (firstOk) return firstOk.msg;
  }

  if (pick === "longest") {
    const longest = results
      .filter(r => r.msg?.content)
      .sort((a,b) => (b.msg!.content.length - a.msg!.content.length))[0];
    if (longest) return longest.msg;
  }

  if (pick === "json-valid") {
    for (const r of results) {
      const c = r.msg?.content;
      if (!c) continue;
      try { JSON.parse(c); return r.msg; } catch {}
    }
  }

  const any = results.find(r => r.msg);
  if (any) return any.msg;
  throw results.at(-1)?.error || new Error("All fan-out calls failed");
}

