"use client";
import { Globe2 } from "lucide-react";
import { COUNTRIES } from "@/data/countries";

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

export default function HeaderLive({
  dark,
  setDark,
  country,
  setCountry,
  isActive,
  disabled,
  onModePress,
}: HeaderLiveProps) {
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

        <div
          className={`relative flex items-center border rounded-full pl-2 pr-6 py-1 gap-1 shadow-sm
          ${
            dark
              ? "bg-slate-800/80 border-slate-700 text-white"
              : "bg-white/80 border-slate-200 text-slate-900"
          }`}
        >
          <Globe2 className="w-4 h-4" aria-hidden="true" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={`appearance-none bg-transparent outline-none text-sm pl-1 pr-6 py-0.5 rounded-full
              focus:ring-2 focus:ring-blue-500 hover:bg-blue-800/10 ${dark ? "text-white" : "text-slate-900"}`}
            aria-label="Select country"
          >
            {COUNTRIES.map((c) => (
              <option
                key={c.code3}
                value={c.code3}
                className={dark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}
              >
                {c.flag} {c.code3}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70">▾</span>
        </div>
      </div>
    </header>
  );
}
