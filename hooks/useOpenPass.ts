import { useRef } from "react";

/**
 * Small wrapper around the OpenPass SDK. Assumes the global `OpenPass`
 * object has already been loaded on the page. Provides a helper to fetch
 * a location token, triggering the permission popup if necessary.
 */
export function useOpenPass() {
  const openPassRef = useRef<any>();

  if (typeof window !== "undefined" && !openPassRef.current) {
    const OpenPass = (window as any).OpenPass;
    if (OpenPass) {
      openPassRef.current = new OpenPass();
    }
  }

  const getLocationToken = async (): Promise<string | null> => {
    const sdk = openPassRef.current;
    if (!sdk) return null;
    try {
      const token = await sdk.getLocationToken();
      return token || null;
    } catch {
      return null;
    }
  };

  return { getLocationToken };
}

