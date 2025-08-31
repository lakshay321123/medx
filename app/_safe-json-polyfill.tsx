'use client';

// Makes ALL response.json() calls across the app safe.
// If the body isn't valid JSON, it returns { ok, raw } instead of throwing.
export default function SafeJsonPolyfill() {
  if (typeof window !== 'undefined') {
    // Only patch once
    // @ts-ignore
    if (!window.__SAFE_JSON_PATCHED__) {
      // @ts-ignore
      window.__SAFE_JSON_PATCHED__ = true;
      const orig = Response.prototype.json;
      Response.prototype.json = async function patchedJson() {
        try {
          // Try the normal path first — if it's valid JSON, great.
          const text = await this.text();
          try {
            return JSON.parse(text);
          } catch {
            // Return a safe object instead of throwing
            return { ok: this.ok, raw: text };
          }
        } catch (err) {
          // If reading body failed (rare), fallback to empty safe object
          return { ok: this.ok, raw: '' };
        }
      };
    }
  }
  // This component renders nothing — it only runs the patch above.
  return null;
}
