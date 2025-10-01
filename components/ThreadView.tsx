"use client";
import { useEffect } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { ChatWindow } from "@/components/ChatWindow";

export default function ThreadView({ id }: { id: string }) {
  const upsertThread = useChatStore(s => s.upsertThread);
  const setCurrent = useChatStore.setState;

  useEffect(() => {
    upsertThread({ id });
    setCurrent({ currentId: id, draft: null });
  }, [id, upsertThread, setCurrent]);

  return <ChatWindow />;
}

