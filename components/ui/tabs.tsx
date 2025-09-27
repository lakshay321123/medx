"use client";
import * as React from "react";

type Ctx = { value: string; setValue: (v: string) => void };
const TabsContext = React.createContext<Ctx | null>(null);

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [value, setValue] = React.useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>;
}

export function TabsList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        className +
        " flex w-full max-w-xs flex-wrap items-center justify-center gap-2 px-2 sm:w-auto sm:max-w-none sm:justify-start sm:px-0"
      }
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={`w-[132px] rounded-md border px-2 py-1 text-[10px] sm:w-auto sm:px-2.5 sm:text-xs ${
        active ? "bg-muted font-medium" : "hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return <div>{children}</div>;
}
