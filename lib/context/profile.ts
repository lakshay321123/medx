export function getProfileSnapshot() {
  try {
    if (typeof window === "undefined") return ""; // SSR guard
    const v = localStorage.getItem("profile:snapshot");
    return v ? (JSON.parse(v).pretty || String(v)) : "";
  } catch {
    return "";
  }
}
