"use client";
import { useRef } from "react";
import { Globe2 } from "lucide-react";

type ModeKey = "wellness" | "therapy" | "research" | "doctor" | "ai_doc";

type HeaderLiveProps = {
  dark: boolean;
  setDark: (v: boolean) => void;
  country: string;
  setCountry: (v: string) => void;
  isActive: (k: ModeKey) => boolean;
  disabled: (k: ModeKey) => boolean;
  onModePress: (k: ModeKey) => void;
};

const MODES: { key: ModeKey; label: string; icon: string }[] = [
  { key: "wellness", label: "Wellness", icon: "💙" },
  { key: "therapy", label: "Therapy", icon: "🧠" },
  { key: "research", label: "Research", icon: "📚" },
  { key: "doctor", label: "Doctor", icon: "🩺" },
  { key: "ai_doc", label: "AI Doc", icon: "🧪" },
];

const COUNTRIES = [{ code3: "IND" }, { code3: "USA" }, { code3: "GBR" }] as const;

const flagFor = (code: string) => ({ IND: "🇮🇳", USA: "🇺🇸", GBR: "🇬🇧" }[code] ?? "🌐");

export default function HeaderLive({
  dark,
  setDark,
  country,
  setCountry,
  isActive,
  disabled,
  onModePress,
}: HeaderLiveProps) {
  const countryMenuRef = useRef<HTMLDetailsElement>(null);

  return (
    <header
      className={`sticky top-0 z-10 h-[62px] flex items-center justify-between px-4 border-b backdrop-blur-sm
      ${
        dark
          ? "bg-slate-900/60 border-slate-800 text-white"
          : "bg-white/70 border-slate-200/70 text-slate-900"
      }`}
    >
      <div className="flex items-center gap-1 font-semibold text-base">
        <span className="text-lg">🫶</span>
        Second <span className="text-blue-300 ml-1">Opinion</span>
      </div>

      <div className="hidden md:flex items-center gap-1">
        {MODES.map((m) => {
          const active = isActive(m.key);
          const isDisabled = disabled(m.key);
          return (
            <button
              key={m.key}
              onClick={() => onModePress(m.key)}
              disabled={isDisabled}
              className={`px-2.5 py-1 rounded-md border transition-colors
              ${
                active
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : dark
                  ? "bg-slate-800/70 border-slate-700 text-white hover:bg-slate-800"
                  : "bg-white/70 border-slate-200 text-slate-900 hover:bg-slate-100"
              }
              ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span className="mr-1">{m.icon}</span>
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDark(!dark)}
          className={`px-2.5 py-1 rounded-md border ${
            dark
              ? "bg-slate-800/80 border-slate-700 text-white"
              : "bg-white/80 border-slate-200 text-slate-900"
          }`}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? "🌙" : "☀️"}
        </button>

        <details
          ref={countryMenuRef}
          className={`relative flex items-center border rounded-full py-1 pl-2 pr-8 text-sm shadow-sm transition
            ${
              dark
                ? "bg-slate-800/80 border-slate-700 text-white"
                : "bg-white/80 border-slate-200 text-slate-900"
            }`}
        >
          <summary className="flex cursor-pointer items-center gap-2 outline-none [&::-webkit-details-marker]:hidden">
            <Globe2 className="w-4 h-4" aria-hidden="true" />
            <span className="font-medium tracking-wide">{country}</span>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70">▾</span>
          </summary>
          <ul
            className={`absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[8rem] rounded-lg border p-1 text-sm shadow-lg ${
              dark
                ? "bg-slate-900/95 border-slate-700 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {COUNTRIES.map((c) => (
              <li key={c.code3}>
                <button
                  type="button"
                  onClick={() => {
                    setCountry(c.code3);
                    requestAnimationFrame(() => countryMenuRef.current?.removeAttribute("open"));
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left hover:bg-blue-500/10"
                >
                  <span className="text-lg" aria-hidden="true">
                    {flagFor(c.code3)}
                  </span>
                  <span>{c.code3}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </header>
  );
}
