import { prisma } from "@/lib/prisma";
import type { Artifact, ArtifactOps, ArtifactKind } from "./types";

function scope(kind: ArtifactKind) { return `artifact/${kind}`; }
const KEY = "active";

export async function getArtifact(threadId: string, kind: ArtifactKind): Promise<Artifact | null> {
  const rec = await prisma.memory.findUnique({
    where: { threadId_scope_key: { threadId, scope: scope(kind), key: KEY } },
  });
  if (!rec) return null;
  try { return JSON.parse(rec.value) as Artifact; } catch { return null; }
}

export async function setArtifact(threadId: string, kind: ArtifactKind, art: Artifact) {
  await prisma.memory.upsert({
    where: { threadId_scope_key: { threadId, scope: scope(kind), key: KEY } },
    create: { threadId, scope: scope(kind), key: KEY, value: JSON.stringify(art) },
    update: { value: JSON.stringify(art) },
  });
}

function get(obj: any, path: string): any {
  return path.split(".").reduce((a, k) => (a ? a[k] : undefined), obj);
}
function set(obj: any, path: string, value: any) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) { cur[keys[i]] ??= {}; cur = cur[keys[i]]; }
  cur[keys[keys.length - 1]] = value;
}
function addListItem(obj: any, path: string, value: string) {
  const arr = get(obj, path) ?? [];
  if (!Array.isArray(arr)) return;
  if (!arr.includes(value)) arr.push(value);
  set(obj, path, arr);
}
function removeListItem(obj: any, path: string, value?: string) {
  const arr = get(obj, path) ?? [];
  if (!Array.isArray(arr)) return;
  set(obj, path, value ? arr.filter((x: string) => x !== value) : []);
}

export function applyOps(artifact: Artifact, ops: ArtifactOps[]): Artifact {
  const next = JSON.parse(JSON.stringify(artifact));
  for (const op of ops) {
    if (op.op === "add_item") addListItem(next, op.path, op.value);
    else if (op.op === "remove_item") removeListItem(next, op.path, op.value);
    else if (op.op === "set_field") set(next, op.path, op.value);
  }
  return next;
}
