import ChatPageClient from "@/components/ChatPageClient";

type Search = { panel?: string; threadId?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  return <ChatPageClient searchParams={searchParams} />;
}

