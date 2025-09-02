import { normalizeExternalHref } from "./SafeLink";

export function linkify(text: string): string {
  return text.replace(
    /\b(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi,
    (m) => {
      const safe = normalizeExternalHref(m);
      return safe
        ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${m}</a>`
        : m;
    }
  );
}
