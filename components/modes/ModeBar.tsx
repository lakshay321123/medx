"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { reduce } from "@/lib/modes/modeMachine";
import { fromSearchParams, toQuery } from "@/lib/modes/url";

export default function ModeBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const { theme, setTheme } = useTheme();

  const state = useMemo(
    () => fromSearchParams(sp, (theme as "light"|"dark") ?? "light"),
    [sp, theme]
  );

  // remember last non-aidoc base to exit aidoc gracefully
  const lastNonAidoc = useRef<"patient"|"doctor">("patient");
  useEffect(() => {
    if (state.base !== "aidoc") lastNonAidoc.current = state.base;
  }, [state.base]);

  const apply = (action: Parameters<typeof reduce>[1]) => {
    const current = new URLSearchParams(sp.toString());
    // custom exit for aidoc toggle
    if (action.type === "toggle/aidoc" && state.base === "aidoc") {
      // drop AiDoc-specific params so fromSearchParams doesn't detect AiDoc again
      current.delete("threadId");
      current.delete("context");
      const q = toQuery(
        { ...state, base: lastNonAidoc.current, therapy: false, research: false },
        current,
      );
      router.push(q);
      return;
    }
    const next = reduce(state, action);
    router.push(toQuery(next, current));
  };

  const btn = (active: boolean, disabled?: boolean) =>
    `h-9 px-3 rounded-lg border text-sm transition
     ${active ? "bg-[var(--medx-accent)] text-white border-[var(--medx-accent)]"
              : "bg-card text-foreground border-border hover:bg-muted"}
     ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  const aidocOn = state.base === "aidoc";

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-screen-xl items-center gap-2 px-4 py-2">
        <button className={btn(state.base === "patient")}
                onClick={() => apply({ type: "toggle/patient" })}>
          Patient
        </button>
        <button className={btn(state.therapy, aidocOn || state.base !== "patient")}
                disabled={aidocOn || state.base !== "patient"}
                onClick={() => apply({ type: "toggle/therapy" })}>
          Therapy
        </button>
        <button className={btn(state.research, aidocOn)} disabled={aidocOn}
                onClick={() => apply({ type: "toggle/research" })}>
          Research
        </button>
        <button className={btn(state.base === "doctor")}
                onClick={() => apply({ type: "toggle/doctor" })}>
          Doctor
        </button>

        <div className="mx-2 h-6 w-px bg-border" />

        <button className={btn(aidocOn)} onClick={() => apply({ type: "toggle/aidoc" })}>
          AI Doc
        </button>

        <div className="ml-auto" />

        <button
          className={btn(theme === "dark")}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </div>
  );
}
