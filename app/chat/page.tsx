"use client";
import ChatPane from "@/components/panels/ChatPane";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createConversationId } from "@/lib/conversation";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const conv = params.get("c");

  useEffect(() => {
    if (!conv) {
      const id = createConversationId();
      router.replace(`/chat?c=${id}`, { scroll: false });
    }
  }, [conv, router]);

  if (!conv) return null;
  return <ChatPane conversationId={conv} />;
}
