"use client";
import { Search, Settings } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createNewThreadId, listThreads, saveThreads, Thread } from "@/lib/chatThreads";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";
import { useLocale } from "@/components/hooks/useLocale";
import { useUIStore } from "@/components/hooks/useUIStore";
import { IconNewChat } from "@/components/icons";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { useProjects } from "@/components/hooks/useProjects";
import ProjectGroup from "./sidebar/ProjectGroup";
import ThreadRow from "./sidebar/ThreadRow";

export default function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get("threadId") ?? "";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [q, setQ] = useState("");

  const closeSidebar = useMobileUiStore((state) => state.closeSidebar);
  const t = useT();
  const openPrefs = useUIStore((state) => state.openPrefs);
  const locale = useLocale();
  const prefs = usePrefs();

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

  const handleNewChat = () => {
    const id = createNewThreadId();
    closeSidebar();
    router.push(`/?panel=chat&threadId=${id}`);
  };

  const handleSearch = (value: string) => {
    setQ(value);
    window.dispatchEvent(new CustomEvent("search-chats", { detail: value }));
  };

  const { projects, createProject } = useProjects();
  const filtered = threads.filter((thread) => (thread.title || "").toLowerCase().includes(q.toLowerCase()));
  const ungrouped = filtered.filter((thread) => !thread.projectId);
  const grouped = projects.map((project) => ({
    project,
    threads: filtered.filter((thread) => thread.projectId === project.id),
  }));

  const moveThread = (id: string, projectId: string | null) => {
    setThreads((prev) => {
      let changed = false;
      const next = prev.map((thread) => {
        if (thread.id !== id) return thread;
        if (thread.projectId === projectId) return thread;
        changed = true;
        return { ...thread, projectId };
      });
      if (changed) {
        saveThreads(next);
        return next;
      }
      return prev;
    });
  };

  const handleThreadRenamed = (id: string, title: string) => {
    setThreads((prev) =>
      prev.map((thread) => (thread.id === id ? { ...thread, title, updatedAt: Date.now() } : thread)),
    );
  };

  const handleThreadDeleted = (id: string) => {
    setThreads((prev) => prev.filter((thread) => thread.id !== id));
  };

  return (
    <div className="sidebar-click-guard flex h-full w-full flex-col gap-3 px-4 pt-4 pb-0 text-medx">
      <button
        onClick={() => openPrefs()}
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/60 p-2 shadow-sm backdrop-blur transition hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/60 dark:hover:bg-slate-900"
        aria-label={`${t("Preferences")} · ${locale.label}`}
        title={t("Preferences")}
      >
        <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">You</div>
          <div className="text-xs opacity-70">
            {t("Plan")}: {prefs.plan ?? "free"}
          </div>
        </div>
        <Settings size={14} className="opacity-80" />
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t("threads.systemTitles.new_chat")}
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          <IconNewChat title={t("threads.systemTitles.new_chat")} active size={18} className="text-white" />
          <span>{t("threads.systemTitles.new_chat")}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const name = prompt(t("New project name"));
            if (name) createProject(name);
          }}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/60 dark:hover:bg-slate-900"
          aria-label={t("New Project")}
        >
          <span>▦</span>
          <span>{t("New Project")}</span>
        </button>
      </div>

      <div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60" size={16} />
          <input
            type="search"
            className="w-full rounded-xl border border-slate-200 bg-white/60 py-2 pl-8 pr-2 text-sm shadow-sm outline-none placeholder:opacity-60 focus:border-slate-300 dark:border-white/10 dark:bg-slate-900/60"
            placeholder={t("Search")}
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-1 text-[11px] uppercase tracking-wide opacity-60">{t("Chats")}</div>

      <div
        className="mt-1 space-y-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const tid = e.dataTransfer.getData("text/thread-id");
          if (tid) moveThread(tid, null);
        }}
      >
        {ungrouped.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            draggable
            active={thread.id === threadId}
            onRenamed={(title) => handleThreadRenamed(thread.id, title)}
            onDeleted={() => handleThreadDeleted(thread.id)}
          />
        ))}
        {ungrouped.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-2 text-xs opacity-60 dark:border-white/10">
            {t("Drop a chat here")}
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] uppercase tracking-wide opacity-60">{t("Projects")}</div>

      <div className="mb-16 flex-1 overflow-y-auto pr-1">
        {grouped.map(({ project, threads }) => (
          <ProjectGroup
            key={project.id}
            project={project}
            threads={threads}
            activeThreadId={threadId}
            onMoveThread={moveThread}
            onThreadRenamed={handleThreadRenamed}
            onThreadDeleted={handleThreadDeleted}
          />
        ))}
      </div>
    </div>
  );
}
