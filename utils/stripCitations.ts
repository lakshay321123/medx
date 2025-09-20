export function stripNumericCitations(text: string) {
  return text.replace(/\s*\[(\d+)\]\s*/g, " ");
}
