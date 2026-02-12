import { db } from "@/lib/db";
import { getUserId } from "@/lib/getUserId";
import type { Artifact, ArtifactOps, ArtifactKind } from "./types";

function scope(kind: ArtifactKind) {
  return `artifact/${kind}`;
}
const KEY = "active";

export async function getArtifact(threadId: string, kind: ArtifactKind): Promise<Artifact | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const sb = db();
  const { data } = await sb
    .from("medx_memory")
    .select("value")
    .eq("user_id", userId)
    .eq("scope", "thread")
    .eq("thread_id", threadId)
    .eq("key", `${scope(kind)}:${KEY}`)
    .maybeSingle();

  const val: any = data?.value;
  return (val?.artifact ?? val ?? null) as Artifact | null;
}

export async function setArtifact(threadId: string, kind: ArtifactKind, art: Artifact) {
  const userId = await getUserId();
  if (!userId) return;

  const sb = db();
  await sb.from("medx_memory").upsert(
    {
      user_id: userId,
      scope: "thread",
      thread_id: threadId,
      key: `${scope(kind)}:${KEY}`,
      value: { artifact: art },
    },
    { onConflict: "user_id,scope,thread_id,key" }
  );
}

function get(obj: any, path: string): any {
  return path.split(".").reduce((a, k) => (a ? a[k] : undefined), obj);
}
function set(obj: any, path: string, value: any) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] ??= {};
    cur = cur[keys[i]];
  }
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
