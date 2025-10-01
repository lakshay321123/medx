"use client";
import { create } from "zustand";

export type Project = {
  id: string;
  name: string;
  collapsed?: boolean;
  createdAt: number;
  color?: string;
};

type ProjectState = {
  projects: Project[];
  createProject(name: string): Project;
  renameProject(id: string, name: string): void;
  deleteProject(id: string): void;
  toggleCollapsed(id: string): void;
};

const KEY = "medx.chat.projects";

const load = (): Project[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const save = (p: Project[]) => localStorage.setItem(KEY, JSON.stringify(p.slice(0, 200)));

export const useProjects = create<ProjectState>((set, get) => ({
  projects: [],
  createProject(name) {
    const p: Project = { id: crypto.randomUUID(), name: name.trim() || "Untitled", createdAt: Date.now() };
    const next = [p, ...get().projects];
    save(next); set({ projects: next });
    return p;
  },
  renameProject(id, name) {
    const nextName = name.trim();
    const next = get().projects.map(x => x.id === id ? { ...x, name: nextName || x.name } : x);
    save(next); set({ projects: next });
  },
  deleteProject(id) {
    const next = get().projects.filter(x => x.id !== id);
    save(next); set({ projects: next });
  },
  toggleCollapsed(id) {
    const next = get().projects.map(x => x.id === id ? { ...x, collapsed: !x.collapsed } : x);
    save(next); set({ projects: next });
  },
}));

// boot from localStorage on first import
if (typeof window !== "undefined") {
  const initial = load();
  if (initial?.length) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    useProjects.setState({ projects: initial });
  }
}
