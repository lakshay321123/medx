import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  removeNSPrefix: true,
});

export function parseXml(raw: string): Record<string, any> | null {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }
  try {
    return parser.parse(raw);
  } catch (err) {
    console.warn("[xml] failed to parse payload", err);
    return null;
  }
}

export function firstText(value: any, depth = 0): string | undefined {
  if (value == null || depth > 5) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstText(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === "object") {
    if (typeof value.value === "string") {
      return normalizeText(value.value);
    }
    if (typeof value["#text"] === "string") {
      return normalizeText(value["#text"]);
    }
    for (const key of Object.keys(value)) {
      const found = firstText(value[key], depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === "string") {
    return normalizeText(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function normalizeText(input: string): string | undefined {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
