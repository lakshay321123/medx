"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "medx:prefs-mobile-sheet";

function getInitialPreference() {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "on") return true;
  if (stored === "off") return false;
  return window.matchMedia("(max-width: 639px)").matches;
}

export function usePrefs() {
  const [prefsMobileSheet, setPrefsMobileSheet] = useState<boolean>(() => getInitialPreference());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setPrefsMobileSheet(getInitialPreference());
    const media = window.matchMedia("(max-width: 639px)");
    update();

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        update();
      }
    };

    media.addEventListener("change", update);
    window.addEventListener("storage", onStorage);

    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return useMemo(() => ({ prefsMobileSheet }), [prefsMobileSheet]);
}
