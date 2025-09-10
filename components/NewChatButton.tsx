"use client";
import { useRouter } from "next/navigation";
import { createConversationId } from "@/lib/conversation";

export default function NewChatButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-primary"
      onClick={() => {
        const id = createConversationId();
        router.push(`/chat?c=${id}`);
      }}
    >
      New Chat
    </button>
  );
}
