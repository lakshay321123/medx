"use client";
import { useProjects, type Project } from "@/components/hooks/useProjects";
import { useT } from "@/components/hooks/useI18n";
import { Thread } from "@/lib/chatThreads";
import ThreadRow from "./ThreadRow";

type ProjectGroupProps = {
  project: Project;
  threads: Thread[];
  onMoveThread: (threadId: string, projectId: string | null) => void;
  activeThreadId?: string;
  onThreadRenamed: (threadId: string, title: string) => void;
  onThreadDeleted: (threadId: string) => void;
};

export default function ProjectGroup({
  project,
  threads,
  onMoveThread,
  activeThreadId,
  onThreadRenamed,
  onThreadDeleted,
}: ProjectGroupProps) {
  const { toggleCollapsed, renameProject, deleteProject } = useProjects();
  const { t } = useT();

  return (
    <div role="group" aria-label={project.name} className="mt-2">
      <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5">
        <button
          aria-expanded={!project.collapsed}
          onClick={() => toggleCollapsed(project.id)}
          className="text-xs opacity-80"
          title={project.collapsed ? t("Collapse") : t("Expand")}
        >
          {project.collapsed ? "▸" : "▾"}
        </button>
        <div className="flex-1 truncate font-medium">{project.name}</div>
        <button
          className="text-xs opacity-70 hover:opacity-100"
          onClick={() => {
            const name = prompt(t("Rename project"), project.name);
            if (name) renameProject(project.id, name);
          }}
          title={t("Rename project")}
        >
          ✎
        </button>
        <button
          className="text-xs opacity-70 hover:opacity-100"
          onClick={() => {
            if (confirm(t("Delete project? This won’t delete chats."))) {
              deleteProject(project.id);
              threads.forEach((thread) => onMoveThread(thread.id, null));
            }
          }}
          title={t("Delete project")}
        >
          ⌫
        </button>
      </div>

      {!project.collapsed && (
        <div
          className="ml-3 border-l border-slate-200 pl-2 dark:border-white/10"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const tid = e.dataTransfer.getData("text/thread-id");
            if (tid) onMoveThread(tid, project.id);
          }}
        >
          {threads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              draggable
              active={thread.id === activeThreadId}
              onRenamed={(title) => onThreadRenamed(thread.id, title)}
              onDeleted={() => onThreadDeleted(thread.id)}
            />
          ))}
          {threads.length === 0 && (
            <div className="px-2 py-1 text-xs opacity-60">{t("Drop a chat here")}</div>
          )}
        </div>
      )}
    </div>
  );
}
