"use client";
import * as React from "react";

type Ctx = { value: string; setValue: (v: string) => void };
const TabsContext = React.createContext<Ctx | null>(null);

type TabsProps = {
  defaultValue: string;
  resetKey?: React.Key;
  children: React.ReactNode;
};

export function Tabs({ defaultValue, resetKey, children }: TabsProps) {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue, resetKey]);

  return <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>;
}

export function TabsList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className + " flex gap-2"}>{children}</div>;
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={`text-xs px-2 py-1 rounded-md border ${active ? "bg-muted font-medium" : "hover:bg-muted"}`}
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
