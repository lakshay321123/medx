"use client";
import { useState, useEffect } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("so:sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("so:sidebar-collapsed", next ? "1" : "0");
    // Dispatch event so main content can react
    window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: { collapsed: next } }));
  };

  return (
    <>
      {/* Collapsed strip */}
      <div className={`${collapsed ? "hidden md:flex" : "hidden"} flex-col items-center w-12 shrink-0 border-r border-[var(--so-border,#E5E5EA)] dark:border-[#2C2C2E] bg-[#F9F9F9] dark:bg-[#1C1C1E] py-3`}>
        <button type="button" onClick={toggle} className="rounded-lg p-2 text-[#8E8E93] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] transition" aria-label="Expand sidebar" aria-expanded="false">
          <PanelLeft size={18} />
        </button>
      </div>

      {/* Full sidebar — hidden via CSS, not unmounted */}
      <aside className={`${collapsed ? "hidden" : "hidden md:flex"} overflow-hidden border-r border-[var(--so-border,#E5E5EA)] md:w-[260px] lg:w-[280px] shrink-0 bg-[#F9F9F9] dark:bg-[#1C1C1E] dark:border-[#2C2C2E] relative group`}>
        <button type="button" onClick={toggle} className="absolute top-3 right-2 z-10 rounded-lg p-1.5 text-[#8E8E93] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] transition-opacity" aria-label="Collapse sidebar" aria-expanded="true">
          <PanelLeftClose size={16} />
        </button>
        {children}
      </aside>
    </>
  );
}
