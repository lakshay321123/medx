"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import HeaderLive from "./HeaderLive";
import { useCountry } from "@/lib/country";
import { fromSearchParams } from "@/lib/modes/url";

export type UiState = {
  primary: "wellness" | "therapy" | "doctor";
  research: boolean;
  aiDoc: boolean;
};

type ModeKey = "wellness" | "therapy" | "research" | "doctor" | "ai_doc";

type ShellProps = {
  Sidebar: React.ComponentType;
  Main: React.ComponentType<{ ui: UiState; panel: string }>;
  Composer?: React.ComponentType;
};

export default function ShellLive({ Sidebar, Main, Composer }: ShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme, systemTheme } = useTheme();
  const { country: activeCountry, setCountry } = useCountry();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const resolvedTheme = theme === "system" ? systemTheme ?? "light" : theme ?? "light";
  const dark = (mounted ? resolvedTheme : "light") === "dark";

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const panel = params.get("panel")?.toLowerCase() ?? "chat";

  const modeState = useMemo(
    () => fromSearchParams(params, dark ? "dark" : "light"),
    [params, dark],
  );

  const lastNonAiDocRef = useRef({ base: modeState.base, therapy: modeState.therapy, research: modeState.research });

  const aiDocActive = panel === "ai-doc" || modeState.base === "aidoc";
  useEffect(() => {
    if (!aiDocActive) {
      lastNonAiDocRef.current = {
        base: modeState.base === "aidoc" ? "patient" : modeState.base,
        therapy: modeState.therapy,
        research: modeState.research,
      };
    }
  }, [aiDocActive, modeState.base, modeState.therapy, modeState.research]);

  const ui = useMemo<UiState>(() => {
    const last = lastNonAiDocRef.current;
    const base = aiDocActive ? last.base : modeState.base;
    let primary: UiState["primary"] = "wellness";
    if (base === "doctor") primary = "doctor";
    else if (aiDocActive ? last.therapy : modeState.therapy) primary = "therapy";
    return {
      primary,
      research: aiDocActive ? last.research : modeState.research,
      aiDoc: aiDocActive,
    };
  }, [aiDocActive, modeState.base, modeState.research, modeState.therapy]);

  const pushParams = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      if (query === searchParams.toString()) return;
      const url = query ? `${pathname}?${query}` : pathname;
      router.push(url);
    },
    [pathname, router, searchParams],
  );

  const onModePress = useCallback(
    (key: ModeKey) => {
      const next = new URLSearchParams(searchParams.toString());
      if (key === "ai_doc") {
        if (panel === "ai-doc") {
          const last = lastNonAiDocRef.current;
          next.set("panel", "chat");
          next.set("mode", last.base === "doctor" ? "doctor" : "patient");
          if (last.therapy && last.base !== "doctor") next.set("therapy", "1");
          else next.delete("therapy");
          if (last.research && last.base !== "aidoc") next.set("research", "1");
          else next.delete("research");
          next.delete("context");
          if (next.get("threadId") === "med-profile") next.delete("threadId");
          pushParams(next);
        } else {
          next.set("panel", "ai-doc");
          next.delete("mode");
          next.delete("therapy");
          next.delete("research");
          pushParams(next);
        }
        return;
      }

      next.set("panel", "chat");
      next.delete("context");
      if (key === "wellness") {
        next.set("mode", "patient");
        next.delete("therapy");
      } else if (key === "therapy") {
        const toggled = ui.primary === "therapy";
        next.set("mode", "patient");
        if (toggled) next.delete("therapy");
        else next.set("therapy", "1");
        next.delete("research");
      } else if (key === "doctor") {
        if (ui.primary === "doctor") {
          next.set("mode", "patient");
        } else {
          next.set("mode", "doctor");
        }
        next.delete("therapy");
      } else if (key === "research") {
        if (ui.aiDoc || ui.primary === "therapy") return;
        const isResearch = ui.research;
        const base = ui.primary === "doctor" ? "doctor" : "patient";
        next.set("mode", base);
        if (isResearch) next.delete("research");
        else next.set("research", "1");
        next.delete("therapy");
      }
      pushParams(next);
    },
    [panel, pushParams, searchParams, ui.aiDoc, ui.primary, ui.research],
  );

  const isActive = useCallback(
    (key: ModeKey) => {
      if (key === "ai_doc") return ui.aiDoc;
      if (key === "research") return ui.research;
      if (key === "therapy") return ui.primary === "therapy";
      if (key === "doctor") return ui.primary === "doctor" && !ui.aiDoc;
      return ui.primary === "wellness";
    },
    [ui.aiDoc, ui.primary, ui.research],
  );

  const disabled = useCallback(
    (key: ModeKey) => {
      if (key === "research") return ui.primary === "therapy" || ui.aiDoc;
      if (key === "therapy") return ui.aiDoc;
      return false;
    },
    [ui.aiDoc, ui.primary],
  );

  const toggleDark = useCallback(() => {
    setTheme(dark ? "light" : "dark");
  }, [dark, setTheme]);

  const SidebarComponent = Sidebar;
  const MainComponent = Main;
  const ComposerComponent = Composer;
  const composerElement = ComposerComponent ? <ComposerComponent /> : null;

  const appBg = useMemo(
    () =>
      dark
        ? "bg-[linear-gradient(180deg,#06122E_0%,#071534_15%,#0A1C45_100%)] text-white"
        : "bg-gradient-to-b from-sky-50 via-indigo-50 to-violet-100 text-slate-900",
    [dark],
  );

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${appBg}`}>
      <HeaderLive
        dark={dark}
        toggleDark={toggleDark}
        country={activeCountry.code3}
        setCountry={setCountry}
        isActive={isActive}
        disabled={disabled}
        onModePress={onModePress}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid h-full min-h-0 grid-cols-12">
          <aside
            className={`col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-2 backdrop-blur-sm p-3 flex h-full flex-col gap-3 text-sm border-r min-h-0
            ${dark ? "bg-slate-900/40 border-slate-800 text-white" : "bg-white/70 border-slate-200/60 text-slate-900"}`}
          >
            <SidebarComponent />
          </aside>

          <section
            className={`col-span-12 md:col-span-8 lg:col-span-9 xl:col-span-10 flex min-h-0 flex-col overflow-hidden
            ${dark ? "text-white" : "text-slate-900"}`}
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-6 medx-pane medx-ring">
                <MainComponent ui={ui} panel={panel} />
              </div>
            </div>

            {composerElement ? (
              <div className="px-6 pb-6">
                <div
                  className={`rounded-xl border shadow-lg ${dark ? "bg-slate-900/70 border-slate-800" : "bg-white/80 border-slate-200/70"}`}
                >
                  {composerElement}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
