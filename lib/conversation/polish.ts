export function polishResponse(text: string): string {
  let polished = text
    .replace(/\s{2,}/g, " ")
    .replace(/\.\.\.$/, "…");

  // Capitalize first letter
  polished = polished.charAt(0).toUpperCase() + polished.slice(1);

  // Remove lazy "etc."
  polished = polished.replace(/\betc\.*$/i, "");

  return polished.trim();
}
