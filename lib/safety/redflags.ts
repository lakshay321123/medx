export function detectRedFlags(text: string) {
  const s = text.toLowerCase();
  return /(acute chest pain|shortness of breath|stroke symptoms|suicidal|anaphylaxis|severe bleeding)\b/.test(s);
}
