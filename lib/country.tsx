"use client";
import { createContext, useContext, useState } from "react";
import { COUNTRIES, byCode2 } from "@/data/countries";

const STORAGE_KEY = "medx.country.code3";

type Ctx = {
  country: { code3: string; code2: string; name: string; flag: string };
  setCountry: (code3: string) => void;
};

const CountryContext = createContext<Ctx | null>(null);

function inferFromLocale(): string {
  try {
    const locale =
      Intl.DateTimeFormat().resolvedOptions().locale ||
      navigator.language ||
      "";
    const c2 = locale.split("-")[1]?.toUpperCase();
    const hit = c2 && byCode2(c2);
    return hit?.code3 ?? "USA";
  } catch {
    return "USA";
  }
}

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [code3, setCode3] = useState<string>(() => {
    if (typeof window === "undefined") return "USA";
    return localStorage.getItem(STORAGE_KEY) || inferFromLocale();
  });

  const setCountry = (newCode3: string) => {
    setCode3(newCode3);
    if (typeof window !== "undefined")
      localStorage.setItem(STORAGE_KEY, newCode3);
  };

  const cur =
    COUNTRIES.find(c => c.code3 === code3) ||
    COUNTRIES.find(c => c.code3 === "USA")!;
  return (
    <CountryContext.Provider value={{ country: cur, setCountry }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error("useCountry must be used within CountryProvider");
  return ctx;
}
