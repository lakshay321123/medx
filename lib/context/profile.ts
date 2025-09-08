export function getProfileSnapshot() {
  try {
    const v = localStorage.getItem("profile:snapshot");
    return v ? JSON.parse(v).pretty || String(v) : "";
  } catch {
    return "";
  }
}

