"use client";

import { Globe2 } from "lucide-react";

const MODES: { key: ModeKey; label: string; icon: string }[] = [
  { key: "wellness", label: "Wellness", icon: "💙" },
  { key: "therapy", label: "Therapy", icon: "🧠" },
  { key: "research", label: "Research", icon: "📚" },
  { key: "doctor", label: "Doctor", icon: "🩺" },
  { key: "ai_doc", label: "AI Doc", icon: "🧪" },
];

const COUNTRY_CHOICES: readonly string[] = ["IND", "USA", "GBR"];
const FLAG_BY_CODE: Record<string, string> = { IND: "🇮🇳", USA: "🇺🇸", GBR: "🇬🇧" };

function flagFor(code3: string) {
  return FLAG_BY_CODE[code3] ?? "🌐";
}

type ModeKey = "wellness" | "therapy" | "research" | "doctor" | "ai_doc";

type Props = {
  dark: boolean;
  toggleDark: () => void;
  country: string;
  setCountry: (code3: string) => void;
  isActive: (key: ModeKey) => boolean;
  disabled: (key: ModeKey) => boolean;
  onModePress: (key: ModeKey) => void;
};

export default function HeaderLive({
  dark,
  toggleDark,
  country,
  setCountry,
  isActive,
  disabled,
  onModePress,
}: Props) {
  const seen = new Set<string>();
  const optionList = (COUNTRY_CHOICES.includes(country) ? COUNTRY_CHOICES : [country, ...COUNTRY_CHOICES]).filter(code => {
    if (!code) return false;
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });

  return (
    <header
      className={`sticky top-0 z-10 h-[62px] flex items-center justify-between px-4 border-b backdrop-blur-sm text-sm transition-colors
      ${dark ? "bg-slate-900/60 border-slate-800 text-white" : "bg-white/70 border-slate-200/70 text-slate-900"}`}
    >
      <div className="flex items-center gap-1 font-semibold text-base">
        <span className="text-lg">🫶</span>
        Second
        <span className="text-blue-300 ml-1">Opinion</span>
      </div>

      <div className="hidden md:flex items-center gap-1">
        {MODES.map(mode => (
          <button
            key={mode.key}
            type="button"
            onClick={() => onModePress(mode.key)}
            disabled={disabled(mode.key)}
            className={`px-2.5 py-1 rounded-md border transition-colors flex items-center
              ${isActive(mode.key)
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : dark
                  ? "bg-slate-800/70 border-slate-700 text-white hover:bg-slate-800"
                  : "bg-white/70 border-slate-200 text-slate-900 hover:bg-slate-100"}
              ${disabled(mode.key) ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span className="mr-1" aria-hidden>
              {mode.icon}
            </span>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleDark}
          className={`px-2.5 py-1 rounded-md border transition-colors
            ${dark ? "bg-slate-800/80 border-slate-700 text-white" : "bg-white/80 border-slate-200 text-slate-900"}`}
        >
          {dark ? "🌙" : "☀️"}
        </button>

        <div
          className={`relative flex items-center border rounded-full pl-2 pr-6 py-1 gap-1 shadow-sm
          ${dark ? "bg-slate-800/80 border-slate-700 text-white" : "bg-white/80 border-slate-200 text-slate-900"}`}
        >
          <Globe2 className="w-4 h-4" aria-hidden />
          <select
            value={country}
            onChange={event => setCountry(event.target.value)}
            className={`appearance-none bg-transparent outline-none text-sm pl-1 pr-6 py-0.5 rounded-full
              focus:ring-2 focus:ring-blue-500 hover:bg-blue-800/10 ${dark ? "text-white" : "text-slate-900"}`}
          >
            {optionList.map(code => (
              <option
                key={code}
                value={code}
                className={dark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}
              >
                {flagFor(code)} {code}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" aria-hidden>
            ▾
          </span>
        </div>
      </div>
    </header>
  );
}
