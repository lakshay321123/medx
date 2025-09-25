"use client";

import { useCallback } from "react";
import { Menu, MoreHorizontal, PlusCircle } from "lucide-react";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useRouter, useSearchParams } from "next/navigation";
import { createNewThreadId } from "@/lib/chatThreads";
import Logo from "@/components/brand/Logo";

export default function MobileHeader() {
  const openSidebar = useMobileUiStore(state => state.openSidebar);
  const openSheet = useMobileUiStore(state => state.openSheet);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleNewChat = useCallback(() => {
    const id = createNewThreadId();
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("panel", "chat");
    params.set("threadId", id);
    router.push(`/?${params.toString()}`);
    window.setTimeout(() => {
      window.dispatchEvent(new Event("focus-chat-input"));
    }, 150);
  }, [router, searchParams]);

  return (
    <header className="mobile-header md:hidden">
      <div className="mobile-header-left">
        <button
          type="button"
          aria-label="Open menu"
          className="mobile-icon-btn"
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo variant="white" width={120} height={28} className="mobile-header-logo" />
      </div>
      <div className="mobile-header-actions">
        <button
          type="button"
          aria-label="New chat"
          className="mobile-icon-btn"
          onClick={handleNewChat}
        >
          <PlusCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Open options"
          className="mobile-icon-btn"
          onClick={() => openSheet("main")}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
