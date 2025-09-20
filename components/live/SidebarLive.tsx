"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createNewThreadId,
  listThreads,
  Thread,
} from "@/lib/chatThreads";
import ThreadKebab from "@/components/chat/ThreadKebab";
import { useCountry } from "@/lib/country";

const NAV_ITEMS = [
  { key: "chat", label: "Chat", panel: "chat" },
  {
    key: "ai-doc",
    label: "AI Doc",
    panel: "chat",
    threadId: "med-profile",
    context: "profile",
  },
  { key: "profile", label: "Medical Profile", panel: "profile" },
  { key: "timeline", label: "Timeline", panel: "timeline" },
  { key: "alerts", label: "Alerts", panel: "alerts" },
  { key: "settings", label: "Settings", panel: "settings" },
];

type AidocThread = { id: string; title: string | null };

export default function SidebarLive() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { country } = useCountry();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [aidocThreads, setAidocThreads] = useState<AidocThread[]>([]);
  const [q, setQ] = useState("");

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
      .then((r) => r.json())
      .then((data) => setAidocThreads(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const currentPanel = (searchParams.get("panel") ?? "chat").toLowerCase();
  const currentThreadId = searchParams.get("threadId") ?? undefined;
  const currentContext = searchParams.get("context") ?? undefined;

  const filteredThreads = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((t) => t.title.toLowerCase().includes(query));
  }, [threads, q]);

  const handleNewChat = () => {
    const id = createNewThreadId();
    router.push(`/?panel=chat&threadId=${id}`);
  };

  const handleSearch = (value: string) => {
    setQ(value);
    window.dispatchEvent(new CustomEvent("search-chats", { detail: value }));
  };

  const handleNavigate = (item: (typeof NAV_ITEMS)[number]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("panel", item.panel);
    if (item.threadId || (item.key === "chat" && currentThreadId)) {
      const threadTarget =
        item.key === "chat" ? currentThreadId ?? undefined : item.threadId;
      if (threadTarget) params.set("threadId", threadTarget);
      else params.delete("threadId");
    } else {
      params.delete("threadId");
    }
    if (item.context) params.set("context", item.context);
    else params.delete("context");
    router.push(`/?${params.toString()}`);
  };

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (currentPanel !== item.panel) return false;
    if (item.threadId) {
      const matchThread = currentThreadId === item.threadId;
      const matchContext = item.context
        ? currentContext === item.context
        : !currentContext;
      return matchThread && matchContext;
    }
    if (item.key === "chat" && currentThreadId) return true;
    return !currentThreadId;
  };

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <button
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 shadow-sm"
        type="button"
        onClick={handleNewChat}
      >
        <span className="text-lg leading-none">＋</span> New chat
      </button>

      <input
        className="w-full rounded-md border px-2 py-1.5 bg-white/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
        placeholder="Search chats"
        value={q}
        onChange={(e) => handleSearch(e.target.value)}
      />

      <nav className="grid gap-1 text-sm">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleNavigate(item)}
            className={`px-2 py-1.5 rounded-md border transition-colors text-left ${
              isActive(item)
                ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                : "border-transparent hover:bg-blue-800/10 hover:border-blue-200/30"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40 p-2 space-y-2">
        {filteredThreads.length === 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 px-2">
            No chats in {country.code3} yet.
          </div>
        )}
        {filteredThreads.map((thread) => (
          <div
            key={thread.id}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
              currentThreadId === thread.id && currentPanel === "chat"
                ? "border-blue-400/70 bg-blue-500/10"
                : "border-transparent hover:border-blue-200/40 hover:bg-blue-800/5"
            }`}
          >
            <button
              onClick={() => router.push(`/?panel=chat&threadId=${thread.id}`)}
              className="flex-1 text-left truncate"
              title={thread.title}
            >
              {thread.title}
            </button>
            <ThreadKebab
              id={thread.id}
              title={thread.title}
              onRenamed={(nextTitle) => {
                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === thread.id
                      ? { ...t, title: nextTitle, updatedAt: Date.now() }
                      : t
                  )
                );
              }}
              onDeleted={() => {
                setThreads((prev) => prev.filter((t) => t.id !== thread.id));
              }}
            />
          </div>
        ))}

        {aidocThreads.length > 0 && (
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="px-2 text-xs font-semibold opacity-70">AI Doc</div>
            {aidocThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() =>
                  router.push(`/?panel=ai-doc&threadId=${thread.id}&context=profile`)
                }
                className="w-full text-left rounded-md border border-transparent px-3 py-2 text-sm hover:border-blue-200/40 hover:bg-blue-800/5"
              >
                {thread.title ?? "AI Doc — New Case"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto pt-2">
        <button
          className="w-full border rounded-md px-2 py-1.5 text-left hover:bg-blue-800/10"
          type="button"
          onClick={() => handleNavigate(NAV_ITEMS.find((i) => i.key === "settings")!)}
        >
          ⚙️ Preferences
        </button>
      </div>
    </div>
  );
}
