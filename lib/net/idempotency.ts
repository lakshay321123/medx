function b64url(bytes: Uint8Array) {
  let str = "";
  for (let i = 0; i < bytes.length; i += 1) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newIdempotencyKey() {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return `idem_${b64url(bytes)}`;
    }
  }

  const timestamp =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const r1 = Math.random().toString(36).slice(2, 15);
  const r2 = Math.random().toString(36).slice(2, 15);
  return `idem_${timestamp.toString(36)}_${r1}${r2}`;
}
