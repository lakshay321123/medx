"use client";

import { Menu, MoreHorizontal, PlusCircle } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/state/chatStore";

export default function MobileHeader() {
  const openSidebar = useMobileUiStore(state => state.openSidebar);
  const openSheet = useMobileUiStore(state => state.openSheet);
  const startNewThread = useChatStore(state => state.startNewThread);
  const router = useRouter();

  const handleNewChat = () => {
    const id = startNewThread();
    router.push(`/chat/${id}`);
  };

  return (
    <header className="mobile-header md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        className="mobile-icon-btn"
        onClick={openSidebar}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center overflow-hidden">
        <Logo width={132} height={36} className="mobile-header-logo" variant="white" />
      </div>

      <div className="ml-auto flex items-center gap-2">
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
