export function langBase(s?: string) {
  return (s || "en").split("-")[0].toLowerCase();
}
