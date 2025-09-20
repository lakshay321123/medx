"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import HeaderLive from "./HeaderLive";
import SidebarLive from "./SidebarLive";
import MainLive from "./MainLive";
import { useCountry } from "@/lib/country";
import { fromSearchParams, toQuery } from "@/lib/modes/url";
import { canonicalize } from "@/lib/modes/modeMachine";
import type { ModeState } from "@/lib/modes/types";

type ModeKey = "wellness" | "therapy" | "research" | "doctor" | "ai_doc";

export default function ShellLive() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { country, setCountry } = useCountry();
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  const currentTheme = (theme === "system" ? resolvedTheme : theme) ?? "light";
  const dark = currentTheme === "dark";

  const modeState = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return canonicalize(fromSearchParams(params, dark ? "dark" : "light"));
  }, [searchParams, dark]);

  const handleModePress = useCallback(
    (key: ModeKey) => {
      let next: ModeState = { ...modeState };
      switch (key) {
        case "ai_doc":
          next.base = modeState.base === "aidoc" ? "patient" : "aidoc";
          next.therapy = false;
          next.research = false;
          break;
        case "doctor":
          next.base = "doctor";
          next.therapy = false;
          break;
        case "therapy":
          next.base = "patient";
          next.therapy = !modeState.therapy;
          if (next.therapy) next.research = false;
          break;
        case "research":
          next.research = !modeState.research;
          if (next.research) {
            next.base = modeState.base === "doctor" ? "doctor" : "patient";
            next.therapy = false;
          }
          break;
        case "wellness":
        default:
          next.base = "patient";
          next.therapy = false;
          break;
      }
      next = canonicalize(next);
      router.push(toQuery(next, searchParams));
    },
    [modeState, router, searchParams],
  );

  const isActive = useCallback(
    (key: ModeKey) => {
      switch (key) {
        case "ai_doc":
          return modeState.base === "aidoc";
        case "research":
          return modeState.research;
        case "therapy":
          return modeState.therapy;
        case "doctor":
          return modeState.base === "doctor";
        case "wellness":
        default:
          return modeState.base === "patient" && !modeState.therapy;
      }
    },
    [modeState],
  );

  const disabled = useCallback(
    (key: ModeKey) => {
      if (key === "therapy") return modeState.base !== "patient";
      if (key === "research") return modeState.therapy || modeState.base === "aidoc";
      return false;
    },
    [modeState],
  );

  const appBg = useMemo(
    () =>
      dark
        ? "bg-[linear-gradient(180deg,#06122E_0%,#071534_15%,#0A1C45_100%)] text-white"
        : "bg-gradient-to-b from-sky-50 via-indigo-50 to-violet-100 text-slate-900",
    [dark],
  );

  const panel = (searchParams.get("panel") ?? "chat").toLowerCase();
  const isChatPanel = panel === "chat";

  return (
    <div className={`flex h-full min-h-screen flex-col ${appBg}`}>
      <HeaderLive
        dark={dark}
        setDark={(value) => setTheme(value ? "dark" : "light")}
        country={country.code3}
        setCountry={setCountry}
        isActive={isActive}
        disabled={disabled}
        onModePress={handleModePress}
      />

      <div className="grid grow min-h-0 grid-cols-1 md:grid-cols-12">
        <aside
          className={`hidden md:flex md:col-span-3 lg:col-span-2 shrink-0 min-h-0 overflow-y-auto backdrop-blur-sm p-3 flex-col gap-3 text-sm border-r ${
            dark
              ? "bg-slate-900/40 border-slate-800 text-white"
              : "bg-white/70 border-slate-200/60 text-slate-900"
          }`}
        >
          <SidebarLive />
        </aside>

        <main className="col-span-1 md:col-span-9 lg:col-span-10 flex min-h-0">
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
              <MainLive panel={panel} chatInputRef={chatInputRef} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
