"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useChatStore } from "@/lib/state/chatStore";
import { SidebarThreads } from "@/components/SidebarThreads";
import { ChatWindow } from "@/components/ChatWindow";

export default function ChatPage() {
  const pathname = usePathname();
  const resetToEmpty = useChatStore(s => s.resetToEmpty);

  useEffect(() => {
    // fresh landing: no thread id in the url → reset everything
    const isThreadRoute = /^\/chat\/[A-Za-z0-9_-]+$/.test(pathname ?? "");
    if (!isThreadRoute) {
      resetToEmpty();
    }
  }, [pathname, resetToEmpty]);

  return (
    <div className="grid grid-cols-[280px_1fr] h-full">
      <aside className="border-r"><SidebarThreads /></aside>
      <main><ChatWindow /></main>
    </div>
  );
}

