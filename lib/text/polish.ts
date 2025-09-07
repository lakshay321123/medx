/**
 * Lightweight post-processor to keep output clean and professional.
 * - Collapses extra spaces
 * - Normalizes bullet spacing
 * - Replaces three ASCII dots with an ellipsis character
 * - Ensures sentences end with proper punctuation where obvious
 */
export function polishText(input: string): string {
  let s = input;

  // Replace "..." with a single ellipsis (repo blocks "..." placeholders)
  s = s.replace(/\.{3,}/g, "…");

  // Collapse multiple spaces
  s = s.replace(/[ \t]{2,}/g, " ");

  // Normalize line endings
  s = s.replace(/\r\n/g, "\n");

  // Ensure bullet spacing ("-text" -> "- text")
  s = s.replace(/(^|\n)-([^\s-])/g, "$1- $2");
  s = s.replace(/(^|\n)\*([^\s*])/g, "$1* $2");

  // Trim trailing spaces per line
  s = s.split("\n").map(line => line.replace(/[ \t]+$/g, "")).join("\n");

  // Ensure final line ends cleanly
  s = s.trimEnd();

  return s;
}
