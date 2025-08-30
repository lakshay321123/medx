'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Locale = {
  countryCode: string | null;   // "IN", "US", "GB", ...
  countryName: string | null;   // "India"
};

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const LocaleCtx = createContext<Ctx>({
  locale: { countryCode: null, countryName: null },
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('medx:locale');
      if (saved) return JSON.parse(saved);
    }
    return { countryCode: null, countryName: null };
  });

  useEffect(() => {
    if (!locale.countryCode) {
      // detect once
      fetch('/api/whereami')
        .then(r => r.json())
        .then((j) => {
          const next = { countryCode: j.country_code, countryName: j.country_name };
          setLocale(next);
          try { localStorage.setItem('medx:locale', JSON.stringify(next)); } catch {}
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('medx:locale', JSON.stringify(locale)); } catch {}
  }, [locale]);

  return (
    <LocaleCtx.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleCtx.Provider>
  );
}

export function useLocale() { return useContext(LocaleCtx); }
