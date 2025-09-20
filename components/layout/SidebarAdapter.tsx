"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Tabs from "@/components/sidebar/Tabs";
import ThreadKebab from "@/components/chat/ThreadKebab";
import { createNewThreadId, listThreads, Thread } from "@/lib/chatThreads";

export default function SidebarAdapter() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [aidocThreads, setAidocThreads] = useState<{ id: string; title: string | null }[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = () => setThreads(listThreads());
    load();
    window.addEventListener("storage", load);
    window.addEventListener("chat-threads-updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("chat-threads-updated", load);
    };
  }, []);

  useEffect(() => {
    fetch("/api/aidoc/threads")
      .then(res => res.json())
      .then(data => setAidocThreads(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(thread => thread.title.toLowerCase().includes(q));
  }, [threads, query]);

  const handleNewChat = () => {
    const id = createNewThreadId();
    router.push(`/?panel=chat&threadId=${id}`);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    window.dispatchEvent(new CustomEvent("search-chats", { detail: value }));
  };

  return (
    <div className="flex flex-col h-full">
      <button
        type="button"
        onClick={handleNewChat}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 shadow-sm"
      >
        <span className="text-lg leading-none" aria-hidden>
          ＋
        </span>
        New chat
      </button>

      <div className="space-y-3">
        <div className="relative mt-3">
          <input
            type="search"
            value={query}
            onChange={event => handleSearch(event.target.value)}
            placeholder="Search chats"
            className="w-full h-10 rounded-lg pl-3 pr-9 text-sm bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} aria-hidden />
        </div>
        <Tabs />
      </div>

      <div className="mt-3 space-y-1 flex-1 overflow-y-auto pr-1">
        {filteredThreads.map(thread => (
          <div
            key={thread.id}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm bg-white/70 dark:bg-slate-900/60 border border-transparent hover:border-blue-400/60 transition"
          >
            <button
              type="button"
              onClick={() => router.push(`/?panel=chat&threadId=${thread.id}`)}
              className="flex-1 text-left truncate"
              title={thread.title}
            >
              {thread.title}
            </button>
            <ThreadKebab
              id={thread.id}
              title={thread.title}
              onRenamed={nextTitle => {
                setThreads(prev => prev.map(t => (t.id === thread.id ? { ...t, title: nextTitle, updatedAt: Date.now() } : t)));
              }}
              onDeleted={() => {
                setThreads(prev => prev.filter(t => t.id !== thread.id));
              }}
            />
          </div>
        ))}

        {aidocThreads.length > 0 && (
          <div className="pt-4 space-y-1">
            <div className="px-3 text-xs font-semibold uppercase tracking-wide opacity-60">AI Doc</div>
            {aidocThreads.map(thread => (
              <button
                key={thread.id}
                type="button"
                onClick={() => router.push(`/?panel=ai-doc&threadId=${thread.id}&context=profile`)}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-transparent hover:border-blue-400/60 transition"
                title={thread.title ?? "AI Doc — New Case"}
              >
                {thread.title ?? "AI Doc — New Case"}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => router.push("/?panel=settings")}
        className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200/70 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-sm hover:bg-white/90 dark:hover:bg-slate-800"
      >
        <Settings size={16} />
        Preferences
      </button>
    </div>
  );
}
