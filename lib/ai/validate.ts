import { MedXStructured, type TMedXStructured } from "@/lib/schemas/medx";

/** Extract first JSON block from an LLM reply (```json ... ``` or raw). */
export function extractJSONBlock(text: string): string | null {
  if (!text) return null;
  const fence = /```json\s*([\s\S]*?)\s*```/i.exec(text) || /```\s*([\s\S]*?)\s*```/i.exec(text);
  if (fence?.[1]) return fence[1].trim();

  const t = text.trim();
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) return t;
  return null;
}

export function safeParseJSON<T = unknown>(jsonText: string):
  | { ok: true; data: T }
  | { ok: false; error: string } {
  try { return { ok: true, data: JSON.parse(jsonText) as T }; }
  catch (e: any) { return { ok: false, error: e?.message ?? "Invalid JSON" }; }
}

export function validateStructured(obj: unknown):
  | { ok: true; data: TMedXStructured }
  | { ok: false; issues: string[] } {
  const res = MedXStructured.safeParse(obj);
  if (res.success) return { ok: true, data: res.data };
  const issues = res.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
  return { ok: false, issues };
}

/** End-to-end helper for dev testing */
export function parseAndValidateFromReply(reply: string) {
  const block = extractJSONBlock(reply);
  if (!block) return { ok: false as const, where: "extract", message: "No JSON block found." };
  const parsed = safeParseJSON(block);
  if (!parsed.ok) return { ok: false as const, where: "parse", message: parsed.error };
  const validated = validateStructured(parsed.data);
  if (!validated.ok) return { ok: false as const, where: "validate", message: validated.issues.join("; ") };
  return { ok: true as const, data: validated.data };
}
